// POST /api/agent  { text, sessionId? }  →  text/event-stream of TurnEvent JSON
//
// The voice layer sends the transcript here. Each SSE `data:` line is one TurnEvent:
//   session   → remember sessionId and send it with the next utterance
//   assistant → text to show and speak
//   tool      → progress ("Searching the catalog…"), optional
//   order     → render the pickup card or the Instacart button
//   profile   → the agent saved something to the household profile; refresh the profile view
//   done      → the turn is over; the mic can listen again
import { DEMO_PROFILE_ID } from '@/lib/profile/store'
import { runTurn, type TurnEvent } from '@/lib/zoowork/turn'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Demo: a single household. With real auth, map the signed-in user to their own profile id.
const DEMO_ACTOR = DEMO_PROFILE_ID

export async function POST(req: Request) {
  let body: { text?: unknown; sessionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: { code: 'invalid_input', message: 'JSON body required' } }, { status: 400 })
  }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : undefined
  if (!text) return Response.json({ error: { code: 'invalid_input', message: 'text is required' } }, { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: TurnEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      try {
        for await (const ev of runTurn({ text, sessionId, actorRef: DEMO_ACTOR, signal: req.signal })) send(ev)
      } catch (err) {
        console.error('[api/agent]', err)
        send({ type: 'done', status: 'failed', error: (err as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  })
}
