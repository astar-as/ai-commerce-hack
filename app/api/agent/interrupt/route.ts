// POST /api/agent/interrupt  { sessionId }  — stop the agent mid-turn (shopper started talking again).
import { interruptTurn } from '@/lib/zoowork/turn'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string }
  if (!sessionId) return Response.json({ error: { code: 'invalid_input', message: 'sessionId is required' } }, { status: 400 })
  await interruptTurn(sessionId)
  return Response.json({ ok: true })
}
