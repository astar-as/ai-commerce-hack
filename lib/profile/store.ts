// Household profiles: the source of truth for allergies, diet and preferences.
// - Allergens and diet are HARD rules: the tools enforce them server-side (see lib/tools).
// - Everything else is a soft preference the agent uses when choosing.
// Persisted to data/profiles.json so a server restart mid-demo keeps what was learned.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Allergen, DietTag } from '@/lib/types'

export type Profile = {
  id: string // also the ZooWork actor ref
  name: string
  email?: string // receipts are emailed here automatically after payment
  household_size: number
  zip?: string
  usual_store_id?: string
  allergens: Allergen[] // never in a search result, never in an order
  diet: DietTag[] // every product must carry these tags
  dislikes: string[] // soft: avoid when choosing ("cilantro")
  brand_preferences: string[] // soft: "Oatly Barista for oat milk"
  fulfillment_preference?: 'pickup' | 'delivery'
  budget_weekly?: number
  notes: string[] // anything else worth remembering ("kid's lunches on Mondays")
  version: number
  updated_at: string
}

export const DEMO_PROFILE_ID = 'household-sam'

const SEED: Profile[] = [
  {
    id: DEMO_PROFILE_ID,
    name: 'Sam Rivera',
    email: process.env.DEMO_EMAIL || 'sam.rivera@example.com',
    household_size: 3,
    zip: '94114',
    usual_store_id: 'safeway-sf-01',
    allergens: ['milk', 'peanuts'],
    diet: [],
    dislikes: [],
    brand_preferences: ['Oatly Barista for oat milk when available'],
    fulfillment_preference: 'pickup',
    budget_weekly: 150,
    notes: ['Two adults and a 7-year-old. Picks up on weekdays after 5 PM.'],
    version: 1,
    updated_at: new Date(0).toISOString(),
  },
]

// Vercel's filesystem is read-only except /tmp (per instance, so edits there are best-effort).
const FILE = process.env.VERCEL ? '/tmp/basket-profiles.json' : join(process.cwd(), 'data', 'profiles.json')

// Read fresh on every call: the file is tiny, and the dev server, agent:chat and agent:smoke
// are separate processes that must all see the same profile.
function load(): Map<string, Profile> {
  let rows: Profile[] = SEED
  try {
    if (existsSync(FILE)) rows = JSON.parse(readFileSync(FILE, 'utf8')) as Profile[]
  } catch (err) {
    console.warn('[profile] could not read profiles.json, using seed:', (err as Error).message)
  }
  return new Map(rows.map((p) => [p.id, p]))
}

function save(map: Map<string, Profile>) {
  try {
    mkdirSync(dirname(FILE), { recursive: true })
    writeFileSync(FILE, JSON.stringify([...map.values()], null, 2))
  } catch (err) {
    console.warn('[profile] could not write profiles.json:', (err as Error).message)
  }
}

export function getProfile(id: string): Profile | undefined {
  return load().get(id)
}

export function listProfiles(): Profile[] {
  return [...load().values()]
}

export type ProfilePatch = Partial<Omit<Profile, 'id' | 'version' | 'updated_at'>>

export function updateProfile(id: string, patch: ProfilePatch): Profile {
  const map = load()
  const current = map.get(id) ?? {
    id, name: 'Shopper', household_size: 1, allergens: [], diet: [], dislikes: [], brand_preferences: [], notes: [],
    version: 0, updated_at: new Date().toISOString(),
  }
  const next: Profile = { ...current, ...patch, id, version: current.version + 1, updated_at: new Date().toISOString() }
  map.set(id, next)
  save(map)
  return next
}

export function resetProfile(id: string): Profile | undefined {
  const seed = SEED.find((p) => p.id === id)
  if (!seed) return undefined
  const map = load()
  const current = map.get(id)
  const next = { ...seed, version: (current?.version ?? 0) + 1, updated_at: new Date().toISOString() }
  map.set(id, next)
  save(map)
  return next
}

// The note injected into the ZooWork session so the agent always knows the household.
export function profileBrief(p: Profile): string {
  const lines = [
    `Household profile (from Basket's profile store, version ${p.version}). Treat it as current truth.`,
    `- Name: ${p.name}; household of ${p.household_size}.`,
    `- Allergens (HARD, never buy, enforced by tools): ${p.allergens.length ? p.allergens.join(', ') : 'none recorded'}.`,
    `- Diet (HARD, enforced by tools): ${p.diet.length ? p.diet.join(', ') : 'none'}.`,
  ]
  if (p.email) lines.push(`- Receipts are emailed automatically to ${p.email.replace(/^(.)[^@]*(@.*)$/, '$1•••$2')} after payment.`)
  if (p.zip) lines.push(`- Zip: ${p.zip}.`)
  if (p.usual_store_id) lines.push(`- Usual store: ${p.usual_store_id}.`)
  if (p.fulfillment_preference) lines.push(`- Usually prefers: ${p.fulfillment_preference}.`)
  if (p.budget_weekly) lines.push(`- Weekly grocery budget: about $${p.budget_weekly}.`)
  if (p.brand_preferences.length) lines.push(`- Brand preferences: ${p.brand_preferences.join('; ')}.`)
  if (p.dislikes.length) lines.push(`- Dislikes: ${p.dislikes.join(', ')}.`)
  if (p.notes.length) lines.push(`- Notes: ${p.notes.join(' ')}`)
  return lines.join('\n')
}
