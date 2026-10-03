import { profileViolations } from '../profile/guard'
import { allProducts, getProduct, getStock } from './catalog-source'
import { ToolError, type Allergen, type DietTag, type Product, type StoreStock, type ToolContext, type ToolDefinition } from './types'

export type SearchCatalogInput = {
  query: string
  store_id?: string
  substitute_for?: string
  in_stock_only?: boolean
  diet?: DietTag[]
  exclude_allergens?: Allergen[]
  max_price?: number
  limit?: number
}

export type SearchCatalogOutput = {
  results: Array<{
    product: Product
    score: number
    stock?: StoreStock
    price_diff?: number
    reason?: string
  }>
  // Hard rules from the household profile, always applied. `hidden` = matches removed by them.
  profile_filters?: { allergens: Allergen[]; diet: DietTag[]; hidden: Array<{ name: string; why: string[] }> }
  took_ms: number
}

const DIET_TAGS: DietTag[] = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free', 'organic', 'kosher']
const ALLERGENS: Allergen[] = ['milk', 'eggs', 'peanuts', 'tree_nuts', 'soy', 'wheat', 'fish', 'shellfish', 'sesame']

function tokens(s: string): string[] {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((t) => t.length > 1)
}

// Mock relevance: token overlap on name/brand/aisle/department/tags. Moss replaces this.
function score(queryTokens: string[], p: Product): number {
  const hay = tokens(`${p.name} ${p.brand} ${p.aisle} ${p.department} ${p.diet_tags.join(' ')}`)
  let s = 0
  for (const q of queryTokens) {
    if (hay.includes(q)) s += 1
    else if (hay.some((h) => h.startsWith(q) || q.startsWith(h))) s += 0.6
  }
  return queryTokens.length ? s / queryTokens.length : 0
}

export async function searchCatalog(input: SearchCatalogInput, ctx: ToolContext = {}): Promise<SearchCatalogOutput> {
  const started = performance.now()
  if (!input.query?.trim()) throw new ToolError('invalid_input', 'query is required')
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20)
  const inStockOnly = input.in_stock_only ?? Boolean(input.store_id)
  const original = input.substitute_for ? getProduct(input.substitute_for) : undefined
  if (input.substitute_for && !original) throw new ToolError('not_found', `unknown product ${input.substitute_for}`)

  const q = tokens(input.query)
  const hidden: Array<{ name: string; why: string[] }> = []
  const rows = allProducts()
    .filter((p) => p.id !== input.substitute_for)
    .filter((p) => {
      const why = profileViolations(p, ctx.profile)
      if (why.length && score(q, p) > 0.3) hidden.push({ name: p.name, why })
      return why.length === 0
    })
    .filter((p) => (input.diet ?? []).every((d) => p.diet_tags.includes(d)))
    .filter((p) => !(input.exclude_allergens ?? []).some((a) => p.allergens.includes(a)))
    .map((p) => {
      const stock = input.store_id ? getStock(input.store_id, p.id) : undefined
      return { product: p, stock, score: score(q, p) }
    })
    .filter((r) => r.score > 0.3)
    .filter((r) => !inStockOnly || r.stock?.in_stock)
    .filter((r) => input.max_price === undefined || (r.stock?.price ?? r.product.price) <= input.max_price)
    .map((r) => {
      const price = r.stock?.price ?? r.product.price
      const price_diff = original ? Math.round((price - original.price) * 100) / 100 : undefined
      const reasons = [
        r.product.store_brand ? 'Store brand' : null,
        original && r.product.aisle === original.aisle ? 'same aisle' : null,
        ...(input.diet ?? []).map((d) => d.replace('_', '-')),
      ].filter(Boolean)
      return { ...r, price_diff, reason: reasons.length ? reasons.join(' · ') : undefined }
    })

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (original && a.product.store_brand !== b.product.store_brand) return a.product.store_brand ? -1 : 1
    if (original) return Math.abs(a.price_diff ?? 0) - Math.abs(b.price_diff ?? 0)
    return 0
  })

  return {
    results: rows.slice(0, limit).map(({ product, score, stock, price_diff, reason }) => ({
      product,
      score: Math.round(score * 100) / 100,
      ...(stock && { stock }),
      ...(price_diff !== undefined && { price_diff }),
      ...(reason && { reason }),
    })),
    ...(ctx.profile && {
      profile_filters: { allergens: ctx.profile.allergens, diet: ctx.profile.diet, hidden: hidden.slice(0, 5) },
    }),
    took_ms: Math.round((performance.now() - started) * 100) / 100,
  }
}

export const searchCatalogTool: ToolDefinition<SearchCatalogInput, SearchCatalogOutput> = {
  name: 'search_catalog',
  description:
    'Search the Safeway catalog. Call it once per item the shopper wants (e.g. "oat milk", "taco seasoning") ' +
    'and only use products it returns: never invent products or prices. Pass store_id to get that store\'s ' +
    'stock, aisle and price (out-of-stock items are left out by default). The household profile\'s ' +
    'allergens and diet are always applied for you; `profile_filters.hidden` lists matches removed for ' +
    'safety, so you can tell the shopper why. Use diet / exclude_allergens only for extra one-off limits. ' +
    'To replace a missing item, pass substitute_for with its product id: results then put store brands (O Organics, Signature Select) first. Returns up to `limit` products.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to look for, e.g. "oat milk barista".' },
      store_id: { type: 'string', description: 'Store id from get_fulfillment_options, e.g. "safeway-sf-01".' },
      substitute_for: { type: 'string', description: 'Product id of the missing item to replace.' },
      in_stock_only: { type: 'boolean', description: 'Defaults to true when store_id is set.' },
      diet: { type: 'array', items: { type: 'string', enum: DIET_TAGS }, description: 'Every tag must match.' },
      exclude_allergens: { type: 'array', items: { type: 'string', enum: ALLERGENS } },
      max_price: { type: 'number', description: 'USD.' },
      limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Default 5.' },
    },
    required: ['query'],
  },
  run: searchCatalog,
}
