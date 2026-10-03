// GET  /api/profile                → the household profile (allergens, diet, preferences)
// PUT  /api/profile  { ...fields } → edit it from the app; the agent gets the new version next turn
// POST /api/profile  { reset: true } → back to the demo seed
// Demo: one household. With real auth, resolve the id from the signed-in user.
import { DEMO_PROFILE_ID, getProfile, resetProfile, updateProfile, type ProfilePatch } from '@/lib/profile/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EDITABLE = [
  'name', 'email', 'household_size', 'zip', 'usual_store_id', 'allergens', 'diet', 'dislikes',
  'brand_preferences', 'fulfillment_preference', 'budget_weekly', 'notes',
] as const

export async function GET() {
  return Response.json({ profile: getProfile(DEMO_PROFILE_ID) ?? null })
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return Response.json({ error: { code: 'invalid_input', message: 'JSON body required' } }, { status: 400 })
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => (EDITABLE as readonly string[]).includes(k))) as ProfilePatch
  return Response.json({ profile: updateProfile(DEMO_PROFILE_ID, patch) })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { reset?: boolean }
  if (!body.reset) return Response.json({ error: { code: 'invalid_input', message: 'expected { reset: true }' } }, { status: 400 })
  return Response.json({ profile: resetProfile(DEMO_PROFILE_ID) })
}
