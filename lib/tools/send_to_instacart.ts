import { createHash } from 'node:crypto'
import { profileViolations } from '../profile/guard'
import { newId, state, type DeliveryHandoff } from '../store/memory'
import { getProduct } from './catalog-source'
import { ToolError, type ToolContext, type ToolDefinition } from './types'

type HealthFilter = 'ORGANIC' | 'GLUTEN_FREE' | 'FAT_FREE' | 'VEGAN' | 'KOSHER' | 'SUGAR_FREE' | 'LOW_FAT'

export type SendToInstacartInput = {
  title: string
  items: Array<{
    product_id?: string
    name: string
    display_text?: string
    quantity: number
    unit?: string
    brand?: string
    health_filters?: HealthFilter[]
  }>
}

export type SendToInstacartOutput = { url: string; item_count: number; mode: 'instacart' | 'mock' }

const BASE_URL = process.env.INSTACART_BASE_URL ?? 'https://connect.dev.instacart.tools'
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

// Instacart asks partners to reuse a link until the list changes.
const linkCache = new Map<string, string>()

async function createInstacartLink(input: SendToInstacartInput, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/idp/v1/products/products_link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      title: input.title,
      link_type: 'shopping_list',
      line_items: input.items.map((item) => ({
        name: item.name,
        display_text: item.display_text,
        line_item_measurements: [{ quantity: item.quantity, unit: item.unit ?? 'each' }],
        filters: {
          ...(item.brand && { brand_filters: [item.brand] }),
          ...(item.health_filters?.length && { health_filters: item.health_filters }),
        },
      })),
      landing_page_configuration: { partner_linkback_url: APP_URL },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Instacart ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const body = (await res.json()) as { products_link_url?: string }
  if (!body.products_link_url) throw new Error('Instacart response had no products_link_url')
  return body.products_link_url
}

export async function sendToInstacart(input: SendToInstacartInput, ctx: ToolContext = {}): Promise<SendToInstacartOutput> {
  if (!input.title?.trim() || !Array.isArray(input.items) || input.items.length === 0) {
    throw new ToolError('invalid_input', 'title and at least one item are required')
  }
  if (ctx.profile) {
    for (const item of input.items) {
      const product = item.product_id ? getProduct(item.product_id) : undefined
      if (!product) throw new ToolError('invalid_input', `"${item.name}" needs a product_id from search_catalog so the household's allergens can be checked.`)
      const why = profileViolations(product, ctx.profile)
      if (why.length) throw new ToolError('invalid_input', `${product.name} is blocked by the household profile (${why.join(', ')}). Pick a safe alternative.`)
    }
  }
  const key = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  let url = linkCache.get(key)
  let mode: SendToInstacartOutput['mode'] = 'instacart'

  if (!url) {
    const apiKey = process.env.INSTACART_API_KEY
    try {
      if (!apiKey) throw new Error('no INSTACART_API_KEY')
      url = await createInstacartLink(input, apiKey)
      linkCache.set(key, url)
    } catch (err) {
      // The demo must not die on Instacart: fall back to our own cart page.
      console.warn('[send_to_instacart] falling back to mock:', (err as Error).message)
      mode = 'mock'
      url = `${APP_URL}/cart/${key.slice(0, 12)}`
    }
  }

  const handoff: DeliveryHandoff = {
    order_id: newId('dl'),
    kind: 'delivery',
    title: input.title,
    url,
    mode,
    item_count: input.items.length,
    created_at: new Date().toISOString(),
  }
  state.orders.unshift(handoff)
  return { url, item_count: input.items.length, mode }
}

export const sendToInstacartTool: ToolDefinition<SendToInstacartInput, SendToInstacartOutput> = {
  name: 'send_to_instacart',
  description:
    'Home delivery: turn the agreed basket into a pre-filled Instacart shopping list and return its link. ' +
    'The shopper opens the link, picks Safeway, chooses a delivery window and pays on Instacart. Only call ' +
    'it after the shopper has confirmed the basket and chosen delivery. Pass each product_id from ' +
    'search_catalog (used for the allergy check) plus a plain search name ("oat milk") and brand, since ' +
    'Instacart matches by name. Do not read the URL aloud; the app shows it as a button.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'e.g. "Taco night for 4"' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'From search_catalog.' },
            name: { type: 'string', description: 'Generic search term, e.g. "oat milk".' },
            display_text: { type: 'string', description: 'e.g. "O Organics Oat Milk, 64 fl oz".' },
            quantity: { type: 'number', exclusiveMinimum: 0 },
            unit: { type: 'string', description: 'each, oz, fl oz, lb, gallon… Default "each".' },
            brand: { type: 'string' },
            health_filters: {
              type: 'array',
              items: { type: 'string', enum: ['ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN', 'KOSHER', 'SUGAR_FREE', 'LOW_FAT'] },
            },
          },
          required: ['product_id', 'name', 'quantity'],
        },
      },
    },
    required: ['title', 'items'],
  },
  run: sendToInstacart,
}
