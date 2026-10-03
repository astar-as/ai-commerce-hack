// Shared types from PLAN.md "Tool interfaces". Keep in sync with the plan.
import type { Profile } from '../profile/store'

export type DietTag = 'vegan' | 'vegetarian' | 'gluten_free' | 'dairy_free' | 'nut_free' | 'organic' | 'kosher'
export type Allergen = 'milk' | 'eggs' | 'peanuts' | 'tree_nuts' | 'soy' | 'wheat' | 'fish' | 'shellfish' | 'sesame'

export type Product = {
  id: string
  name: string
  brand: string
  store_brand: boolean
  department: string
  aisle: string
  size: string
  price: number
  diet_tags: DietTag[]
  allergens: Allergen[]
}

export type StoreStock = {
  store_id: string
  product_id: string
  in_stock: boolean
  qty: number
  aisle_number: string
  price: number
}

export type Store = {
  id: string
  name: string
  address: string
  zip: string
}

export type ToolErrorCode = 'not_found' | 'invalid_input' | 'upstream_failed'

export class ToolError extends Error {
  constructor(public code: ToolErrorCode, message: string) {
    super(message)
  }
}

// Who the call is for. Set by the backend from the authenticated household, never by the model.
export type ToolContext = { profile?: Profile }

export type ToolDefinition<I = any, O = any> = {
  name: string
  // Read by the model to decide when to call the tool. Keep it about *when* and *what*.
  description: string
  input_schema: Record<string, unknown> & { type: 'object' }
  run: (input: I, ctx: ToolContext) => Promise<O>
}
