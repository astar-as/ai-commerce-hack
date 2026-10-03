// One turn against the ZooWork agent: post the shopper's words (plus any system notes), stream
// the agent's events, run our custom tools when it asks, and resolve them so it can continue.
import { assistantText, customToolUse, isRunFinished, runOutcome } from "@zoowork-ai/sdk";
import { runAgentTool } from "@/lib/agent-tools";
import type { ToolContext } from "@/lib/agent-tools/types";
import { profileBrief, type Profile } from "@/lib/profile/store";
import { state } from "@/lib/store/memory";
import { agentId, zoowork } from "./client";

export type TurnEvent =
  | { type: "session"; sessionId: string }
  | { type: "assistant"; text: string }
  | { type: "tool"; phase: "start"; callId: string; name: string; input: unknown }
  | { type: "tool"; phase: "end"; callId: string; name: string; ok: boolean; output: unknown; ms: number }
  | { type: "profile"; profile: Profile }
  | { type: "done"; status: "succeeded" | "failed" | "aborted"; error?: string };

export type TurnInput = {
  text: string;
  // Out-of-band context for this turn (e.g. the current order), posted as system.message.
  notes?: string[];
  sessionId?: string;
  // Stable household id: selects the agent's per-user memory.
  actorRef?: string;
  ctx: ToolContext;
  signal?: AbortSignal;
};

const TURN_TIMEOUT_MS = 90_000;

// Executed custom tool calls, so a replayed `requested` event never runs a tool twice.
// Profile version each session has been told about, so app-side edits get re-sent.
const g = globalThis as typeof globalThis & { __basketHandledCalls?: Set<string>; __basketProfileSeen?: Map<string, number> };
const handledCalls = (g.__basketHandledCalls ??= new Set<string>());
const profileSeen = (g.__basketProfileSeen ??= new Map<string, number>());

export async function* runTurn({ text, notes = [], sessionId, actorRef, ctx, signal }: TurnInput): AsyncGenerator<TurnEvent> {
  const zc = zoowork();
  const aid = agentId();
  const content = text.trim();
  if (!content) throw new Error("text is empty");

  let sid = sessionId;
  // Without a saved cursor for an existing session, skip everything up to its current end.
  let minSeq = -1;
  if (sid) {
    if (state.busy.has(sid)) throw new Error("A turn is already running in this session");
    if (!state.cursors.has(sid)) {
      const history = await zc.listAllEvents(aid, sid);
      minSeq = history.reduce((max, ev) => Math.max(max, ev.seq), -1);
    }
  } else {
    // initial_events only accepts user.message, so open empty and post the notes first.
    const session = await zc.createSession(aid, { metadata: { app: "basket", household: actorRef ?? null } });
    sid = session.session_id;
    yield { type: "session", sessionId: sid };
  }

  const outbound: Array<Record<string, unknown> & { type: string }> = [];
  if (ctx.profile && profileSeen.get(sid) !== ctx.profile.version) {
    outbound.push({ type: "system.message", text: profileBrief(ctx.profile) });
  }
  for (const note of notes) outbound.push({ type: "system.message", text: note });
  outbound.push({
    type: "user.message",
    content,
    idempotency_key: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...(actorRef && { actor: { ref: actorRef } }),
  });
  await zc.postEvents(aid, sid, outbound);
  if (ctx.profile) profileSeen.set(sid, ctx.profile.version);

  state.busy.add(sid);
  const timeout = AbortSignal.timeout(TURN_TIMEOUT_MS);
  const streamSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  try {
    for await (const ev of zc.streamEvents(aid, sid, { cursor: state.cursors.get(sid), signal: streamSignal })) {
      if (ev.cursor) state.cursors.set(sid, ev.cursor);
      if (ev.seq <= minSeq) continue;

      const said = assistantText(ev);
      if (said) yield { type: "assistant", text: said };

      const call = customToolUse(ev);
      if (call?.phase === "requested" && call.name && !handledCalls.has(call.callId)) {
        handledCalls.add(call.callId);
        yield { type: "tool", phase: "start", callId: call.callId, name: call.name, input: call.input ?? {} };

        const started = Date.now();
        const result = await runAgentTool(call.name, call.input, ctx);
        const output = result.ok ? result.output : { error: result.error };
        await zc.resolveCustomToolCall(aid, call.callId, {
          content: [{ type: "json", value: output }],
          isError: !result.ok,
          resolvedBy: "basket-backend",
        });
        yield { type: "tool", phase: "end", callId: call.callId, name: call.name, ok: result.ok, output, ms: Date.now() - started };

        if (call.name === "update_profile" && result.ok && ctx.profile) {
          profileSeen.set(sid, ctx.profile.version); // the agent made this change, it already knows
          yield { type: "profile", profile: ctx.profile };
        }
      }

      if (isRunFinished(ev)) {
        const status = runOutcome(ev) ?? "failed";
        const error = status === "succeeded" ? undefined : String(ev.payload.errorMessage ?? ev.payload.reason ?? "");
        yield { type: "done", status, ...(error && { error }) };
        return;
      }
    }
    yield { type: "done", status: "failed", error: "stream closed before the turn finished" };
  } catch (err) {
    if (timeout.aborted) yield { type: "done", status: "failed", error: "turn timed out" };
    else if (signal?.aborted) yield { type: "done", status: "aborted" };
    else throw err;
  } finally {
    state.busy.delete(sid);
  }
}

// Stop the agent mid-turn (the shopper started talking again).
export async function interruptTurn(sessionId: string): Promise<void> {
  await zoowork().postEvents(agentId(), sessionId, [{ type: "user.interrupt" }]);
}
