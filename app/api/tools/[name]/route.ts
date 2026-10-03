// POST /api/tools/<name>  — call a tool directly, no LLM (e.g. the in-store "not on shelf" tap).
// Same input/output JSON the agent gets, and the same household profile rules apply.
// Errors: { error: { code, message } }.
import { DEMO_PROFILE_ID, getProfile } from '@/lib/profile/store'
import { runTool } from '@/lib/tools'

export const runtime = 'nodejs'

export async function POST(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const input = await req.json().catch(() => null)
  if (input === null) return Response.json({ error: { code: 'invalid_input', message: 'JSON body required' } }, { status: 400 })
  const result = await runTool(name, input, { profile: getProfile(DEMO_PROFILE_ID) })
  if (result.ok) return Response.json(result.output)
  const status = result.error.code === 'not_found' ? 404 : result.error.code === 'invalid_input' ? 400 : 502
  return Response.json({ error: result.error }, { status })
}
