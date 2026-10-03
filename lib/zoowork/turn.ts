// One conversational turn against the ZooWork agent: send the shopper's text, stream the
// agent's events, execute our custom tools when the agent asks, and re-emit a small set of
// UI-friendly events. Used by POST /api/agent and the terminal scripts.
import { assistantText, customToolUse, isRunFinished, runOutcome } from '@zoowork-ai/sdk'
import { getProfile, profileBrief, type Profile } from '../profile/store'
import { state } from '../store/memory'
import { runTool } from '../tools'
import type { ToolContext } from '../tools/types'
import { agentId, zoowork } from './client'

export type TurnEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'assistant'; text: string }
  | { type: 'tool'; phase: 'start'; callId: string; name: string; input: unknown }
  | { type: 'tool'; phase: 'end'; callId: string; name: string; ok: boolean; output: unknown; ms: number }
  // A placed order, for the UI to show as a card (pickup code / Instacart button).
  | { type: 'order'; kind: 'pickup' | 'delivery'; order: unknown }
  // The agent saved something to the household profile ("Saved: egg allergy").
  | { type: 'profile'; profile: Profile }
  | { type: 'done'; status: 'succeeded' | 'failed' | 'aborted'; error?: string }

export type TurnInput = {
  text: string
  sessionId?: string
  // Stable id of the authenticated household: selects its profile and the agent's per-user memory.
  actorRef?: string
  signal?: AbortSignal
}

const TURN_TIMEOUT_MS = 180_000
const ORDER_TOOLS: Record<string, 'pickup' | 'delivery'> = { create_pickup_order: 'pickup', send_to_instacart: 'delivery' }

// Custom tool calls already executed, so a replayed `requested` event never places an order twice.
// Profile version each session has been told about, so changes made in the app get re-sent.
const g = globalThis as typeof globalThis & { __basketHandledCalls?: Set<string>; __basketProfileSeen?: Map<string, number> }
const handledCalls = (g.__basketHandledCalls ??= new Set<string>())
const profileSeen = (g.__basketProfileSeen ??= new Map<string, number>())

export async function* runTurn({ text, sessionId, actorRef, signal }: TurnInput): AsyncGenerator<TurnEvent> {
  const zc = zoowork()
  const aid = agentId()
  const content = text.trim()
  if (!content) throw new Error('text is empty')

  const message = {
    type: 'user.message',
    content,
    idempotency_key: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...(actorRef && { actor: { ref: actorRef } }),
  }

  // The household profile rides along automatically: the shopper never has to repeat allergies.
  const ctx: ToolContext = { profile: actorRef ? getProfile(actorRef) : undefined }

  let sid = sessionId
  // Without a saved cursor for an existing session, skip everything up to the current end.
  let minSeq = -1

  if (sid) {
    if (state.busy.has(sid)) throw new Error('A turn is already running in this session')
    if (!state.cursors.has(sid)) {
      const history = await zc.listAllEvents(aid, sid)
      minSeq = history.reduce((max, ev) => Math.max(max, ev.seq), -1)
    }
  } else {
    // initial_events only accepts user.message, so open empty and post the profile note first.
    const session = await zc.createSession(aid, { metadata: { app: 'basket', household: actorRef ?? null } })
    sid = session.session_id
    yield { type: 'session', sessionId: sid }
  }

  const outbound: Array<Record<string, unknown> & { type: string }> = []
  if (ctx.profile && profileSeen.get(sid) !== ctx.profile.version) {
    outbound.push({ type: 'system.message', text: profileBrief(ctx.profile) })
  }
  outbound.push(message)
  await zc.postEvents(aid, sid, outbound)
  if (ctx.profile) profileSeen.set(sid, ctx.profile.version)

  state.busy.add(sid)
  const timeout = AbortSignal.timeout(TURN_TIMEOUT_MS)
  const streamSignal = signal ? AbortSignal.any([signal, timeout]) : timeout

  try {
    for await (const ev of zc.streamEvents(aid, sid, { cursor: state.cursors.get(sid), signal: streamSignal })) {
      if (ev.cursor) state.cursors.set(sid, ev.cursor)
      if (ev.seq <= minSeq) continue

      const said = assistantText(ev)
      if (said) yield { type: 'assistant', text: said }

      const call = customToolUse(ev)
      if (call?.phase === 'requested' && call.name && !handledCalls.has(call.callId)) {
        handledCalls.add(call.callId)
        yield { type: 'tool', phase: 'start', callId: call.callId, name: call.name, input: call.input ?? {} }

        const started = Date.now()
        const result = await runTool(call.name, call.input, ctx)
        const output = result.ok ? result.output : { error: result.error }
        await zc.resolveCustomToolCall(aid, call.callId, {
          content: [{ type: 'json', value: output }],
          isError: !result.ok,
          resolvedBy: 'basket-backend',
        })

        yield { type: 'tool', phase: 'end', callId: call.callId, name: call.name, ok: result.ok, output, ms: Date.now() - started }
        const kind = ORDER_TOOLS[call.name]
        if (kind && result.ok) yield { type: 'order', kind, order: result.output }
        if (call.name === 'update_profile' && result.ok && ctx.profile) {
          profileSeen.set(sid, ctx.profile.version) // the agent made this change, it already knows
          yield { type: 'profile', profile: ctx.profile }
        }
      }

      if (isRunFinished(ev)) {
        const status = runOutcome(ev) ?? 'failed'
        const error = status === 'succeeded' ? undefined : String(ev.payload.errorMessage ?? ev.payload.reason ?? '')
        yield { type: 'done', status, ...(error && { error }) }
        return
      }
    }
    yield { type: 'done', status: 'failed', error: 'stream closed before the turn finished' }
  } catch (err) {
    if (timeout.aborted) yield { type: 'done', status: 'failed', error: 'turn timed out' }
    else if (signal?.aborted) yield { type: 'done', status: 'aborted' }
    else throw err
  } finally {
    state.busy.delete(sid)
  }
}

// Stop the agent mid-turn (e.g. the shopper starts talking again).
export async function interruptTurn(sessionId: string): Promise<void> {
  await zoowork().postEvents(agentId(), sessionId, [{ type: 'user.interrupt' }])
}
