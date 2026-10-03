import { updateProfile, type Profile, type ProfilePatch } from '../profile/store'
import { ToolError, type Allergen, type DietTag, type ToolContext, type ToolDefinition } from './types'

const DIET_TAGS: DietTag[] = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free', 'organic', 'kosher']
const ALLERGENS: Allergen[] = ['milk', 'eggs', 'peanuts', 'tree_nuts', 'soy', 'wheat', 'fish', 'shellfish', 'sesame']

function requireProfile(ctx: ToolContext): Profile {
  if (!ctx.profile) throw new ToolError('not_found', 'no household profile for this conversation')
  return ctx.profile
}

export const getProfileTool: ToolDefinition<Record<string, never>, Profile> = {
  name: 'get_profile',
  description:
    'Read the household profile (allergens, diet, usual store, zip, brand preferences, budget). It is also ' +
    'given to you at the start of each conversation; call this if you need the latest version.',
  input_schema: { type: 'object', properties: {} },
  run: async (_input, ctx) => requireProfile(ctx),
}

export type UpdateProfileInput = {
  add_allergens?: Allergen[]
  remove_allergens?: Allergen[]
  shopper_confirmed_removal?: boolean
  add_diet?: DietTag[]
  remove_diet?: DietTag[]
  add_brand_preferences?: string[]
  add_dislikes?: string[]
  add_notes?: string[]
  set?: {
    name?: string
    household_size?: number
    zip?: string
    usual_store_id?: string
    fulfillment_preference?: 'pickup' | 'delivery'
    budget_weekly?: number
  }
}

const union = <T>(a: T[], b: T[] = []) => [...new Set([...a, ...b])]
const minus = <T>(a: T[], b: T[] = []) => a.filter((x) => !b.includes(x))

async function runUpdateProfile(input: UpdateProfileInput, ctx: ToolContext) {
  const p = requireProfile(ctx)
  if (input.remove_allergens?.length && !input.shopper_confirmed_removal) {
    throw new ToolError('invalid_input', 'Removing an allergen needs shopper_confirmed_removal: true. Ask the shopper to confirm first.')
  }
  const bad = [...(input.add_allergens ?? []), ...(input.remove_allergens ?? [])].filter((a) => !ALLERGENS.includes(a))
  if (bad.length) throw new ToolError('invalid_input', `unknown allergens: ${bad.join(', ')}. Use one of ${ALLERGENS.join(', ')}; put anything else in add_notes.`)

  const patch: ProfilePatch = {
    allergens: minus(union(p.allergens, input.add_allergens), input.remove_allergens),
    diet: minus(union(p.diet, input.add_diet), input.remove_diet),
    brand_preferences: union(p.brand_preferences, input.add_brand_preferences),
    dislikes: union(p.dislikes, input.add_dislikes),
    notes: union(p.notes, input.add_notes),
    ...(input.set ?? {}),
  }
  const next = updateProfile(p.id, patch)
  ctx.profile = next // later tool calls in this turn see the change immediately
  return { saved: true as const, profile: next }
}

export const updateProfileTool: ToolDefinition<UpdateProfileInput, { saved: true; profile: Profile }> = {
  name: 'update_profile',
  description:
    'Save something lasting about the household to its profile, right away and without asking: a new ' +
    'allergy or intolerance ("my son is allergic to eggs" → add_allergens ["eggs"]), a diet ("we went ' +
    'vegetarian"), a brand preference, a dislike, their zip or usual store, pickup vs delivery, budget. ' +
    'Allergens and diet are then enforced on every search and order automatically. Don\'t save one-off ' +
    'wishes for this order only. Removing an allergen requires the shopper to confirm first.',
  input_schema: {
    type: 'object',
    properties: {
      add_allergens: { type: 'array', items: { type: 'string', enum: ALLERGENS } },
      remove_allergens: { type: 'array', items: { type: 'string', enum: ALLERGENS } },
      shopper_confirmed_removal: { type: 'boolean', description: 'True only after the shopper explicitly confirmed removing an allergen.' },
      add_diet: { type: 'array', items: { type: 'string', enum: DIET_TAGS } },
      remove_diet: { type: 'array', items: { type: 'string', enum: DIET_TAGS } },
      add_brand_preferences: { type: 'array', items: { type: 'string' }, description: 'e.g. "Oatly Barista for oat milk".' },
      add_dislikes: { type: 'array', items: { type: 'string' } },
      add_notes: { type: 'array', items: { type: 'string' }, description: 'Other lasting facts, incl. allergies not in the enum (e.g. "strawberry allergy").' },
      set: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          household_size: { type: 'integer', minimum: 1 },
          zip: { type: 'string' },
          usual_store_id: { type: 'string' },
          fulfillment_preference: { type: 'string', enum: ['pickup', 'delivery'] },
          budget_weekly: { type: 'number' },
        },
      },
    },
  },
  run: runUpdateProfile,
}
