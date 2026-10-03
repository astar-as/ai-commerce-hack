import { profileViolations } from '../profile/guard'
import { newId, state, type OrderLine, type PickupOrder } from '../store/memory'
import { getProduct, getStock, getStore } from './catalog-source'
import { ToolError, type ToolContext, type ToolDefinition } from './types'

export type CreatePickupOrderInput = {
  store_id: string
  slot: string
  customer_name: string
  items: Array<{ product_id: string; quantity: number }>
}

export type CreatePickupOrderOutput = {
  order_id: string
  pickup_code: string
  store_name: string
  store_address: string
  slot: string
  total: number
  lines: OrderLine[]
}

export async function createPickupOrder(input: CreatePickupOrderInput, ctx: ToolContext = {}): Promise<CreatePickupOrderOutput> {
  const store = getStore(input.store_id)
  if (!store) throw new ToolError('not_found', `unknown store ${input.store_id}`)
  if (!input.slot?.trim()) throw new ToolError('invalid_input', 'slot is required')
  if (!Array.isArray(input.items) || input.items.length === 0) throw new ToolError('invalid_input', 'items must not be empty')

  const lines: OrderLine[] = input.items.map(({ product_id, quantity }) => {
    const product = getProduct(product_id)
    if (!product) throw new ToolError('not_found', `unknown product ${product_id}`)
    if (!(quantity > 0)) throw new ToolError('invalid_input', `quantity for ${product_id} must be > 0`)
    const why = profileViolations(product, ctx.profile)
    if (why.length) throw new ToolError('invalid_input', `${product.name} is blocked by the household profile (${why.join(', ')}). Pick a safe alternative.`)
    const stock = getStock(store.id, product_id)
    return { product_id, name: product.name, quantity, unit_price: stock?.price ?? product.price, in_stock: Boolean(stock?.in_stock) }
  })

  const out_of_stock = lines.filter((l) => !l.in_stock).map((l) => l.product_id)
  if (out_of_stock.length) {
    // Don't create a half order: hand the gap back to the agent so it can substitute first.
    throw new ToolError('invalid_input', `out of stock at ${store.name}: ${out_of_stock.join(', ')}. Use search_catalog with substitute_for and retry.`)
  }

  const total = Math.round(lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0) * 100) / 100
  const order: PickupOrder = {
    order_id: newId('pu'),
    kind: 'pickup',
    store_id: store.id,
    store_name: store.name,
    slot: input.slot,
    customer_name: input.customer_name || ctx.profile?.name || 'Guest',
    pickup_code: String(Math.floor(1000 + Math.random() * 9000)),
    lines,
    total,
    status: 'received',
    created_at: new Date().toISOString(),
  }
  state.orders.unshift(order)

  return {
    order_id: order.order_id,
    pickup_code: order.pickup_code,
    store_name: store.name,
    store_address: store.address,
    slot: order.slot,
    total,
    lines,
  }
}

export const createPickupOrderTool: ToolDefinition<CreatePickupOrderInput, CreatePickupOrderOutput> = {
  name: 'create_pickup_order',
  description:
    'Place a store-pickup order at a Safeway. This creates a real order the store starts picking, so only ' +
    'call it after the shopper has said yes to the basket, the store and the slot. Use product ids from ' +
    'search_catalog and a slot from get_fulfillment_options. Fails with the missing ids if anything is out ' +
    'of stock; substitute those and retry. Returns the order id, a 4-digit pickup code and the total.',
  input_schema: {
    type: 'object',
    properties: {
      store_id: { type: 'string' },
      slot: { type: 'string', description: 'Exactly as returned, e.g. "Today 5:30 PM".' },
      customer_name: { type: 'string' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: { product_id: { type: 'string' }, quantity: { type: 'integer', minimum: 1 } },
          required: ['product_id', 'quantity'],
        },
      },
    },
    required: ['store_id', 'slot', 'customer_name', 'items'],
  },
  run: createPickupOrder,
}
