import { getProduct, getStock, getStore } from './catalog-source'
import { ToolError, type StoreStock, type ToolDefinition } from './types'

export type CheckStockInput = { store_id: string; product_ids: string[] }
export type CheckStockOutput = { store_id: string; items: StoreStock[]; unknown_ids: string[] }

export async function checkStock(input: CheckStockInput): Promise<CheckStockOutput> {
  if (!getStore(input.store_id)) throw new ToolError('not_found', `unknown store ${input.store_id}`)
  if (!Array.isArray(input.product_ids) || input.product_ids.length > 100) {
    throw new ToolError('invalid_input', 'product_ids must be an array of at most 100 ids')
  }
  const items: StoreStock[] = []
  const unknown_ids: string[] = []
  for (const id of input.product_ids) {
    const stock = getProduct(id) && getStock(input.store_id, id)
    if (stock) items.push(stock)
    else unknown_ids.push(id)
  }
  return { store_id: input.store_id, items, unknown_ids }
}

export const checkStockTool: ToolDefinition<CheckStockInput, CheckStockOutput> = {
  name: 'check_stock',
  description:
    'Check stock, aisle and store price for a list of product ids at one store. Use it before confirming a ' +
    'pickup order, or when the shopper changes store, to catch items that are out.',
  input_schema: {
    type: 'object',
    properties: {
      store_id: { type: 'string' },
      product_ids: { type: 'array', items: { type: 'string' }, maxItems: 100 },
    },
    required: ['store_id', 'product_ids'],
  },
  run: checkStock,
}
