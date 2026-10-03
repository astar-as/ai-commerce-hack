import { newId, state, type OosEvent } from '../store/memory'
import { getProduct, getStore } from './catalog-source'
import { ToolError, type ToolDefinition } from './types'

export type ReportOosInput = Omit<OosEvent, 'event_id' | 'recorded_at'>
export type ReportOosOutput = { event_id: string; recorded_at: string }

export async function reportOos(input: ReportOosInput): Promise<ReportOosOutput> {
  if (!getStore(input.store_id)) throw new ToolError('not_found', `unknown store ${input.store_id}`)
  if (!getProduct(input.product_id)) throw new ToolError('not_found', `unknown product ${input.product_id}`)
  if (input.outcome === 'substituted' && !input.substitute_product_id) {
    throw new ToolError('invalid_input', 'substitute_product_id is required when outcome is "substituted"')
  }
  const event: OosEvent = { ...input, event_id: newId('oos'), recorded_at: new Date().toISOString() }
  state.oos.unshift(event)
  return { event_id: event.event_id, recorded_at: event.recorded_at }
}

export const reportOosTool: ToolDefinition<ReportOosInput, ReportOosOutput> = {
  name: 'report_oos',
  description:
    'Record that a product is out of stock at a store, and what the shopper did about it. Call it whenever ' +
    'an item the shopper wanted is unavailable (outcome "pending"), and again once they take a substitute ' +
    '("substituted", with substitute_product_id) or drop it ("skipped"). This feeds the store\'s restock list.',
  input_schema: {
    type: 'object',
    properties: {
      store_id: { type: 'string' },
      product_id: { type: 'string', description: 'The missing product.' },
      outcome: { type: 'string', enum: ['pending', 'substituted', 'skipped'] },
      substitute_product_id: { type: 'string' },
      source: { type: 'string', enum: ['shopper_tap', 'voice', 'agent'] },
    },
    required: ['store_id', 'product_id', 'outcome', 'source'],
  },
  run: reportOos,
}
