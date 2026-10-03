// In-memory app state (orders, OOS events, session cursors). No database for the demo.
// Kept on globalThis so Next.js dev hot reloads don't wipe it.

export type OrderLine = { product_id: string; name: string; quantity: number; unit_price: number; in_stock: boolean }

export type PickupOrder = {
  order_id: string
  kind: 'pickup'
  store_id: string
  store_name: string
  slot: string
  customer_name: string
  pickup_code: string
  lines: OrderLine[]
  total: number
  status: 'received' | 'picking' | 'ready' | 'collected'
  created_at: string
}

export type DeliveryHandoff = {
  order_id: string
  kind: 'delivery'
  title: string
  url: string
  mode: 'instacart' | 'mock'
  item_count: number
  created_at: string
}

export type OosEvent = {
  event_id: string
  store_id: string
  product_id: string
  outcome: 'pending' | 'substituted' | 'skipped'
  substitute_product_id?: string
  source: 'shopper_tap' | 'voice' | 'agent'
  recorded_at: string
}

type State = {
  orders: Array<PickupOrder | DeliveryHandoff>
  oos: OosEvent[]
  // ZooWork session id -> last processed stream cursor, so the next turn resumes after it.
  cursors: Map<string, string>
  // Sessions with a turn in flight (one turn at a time per session).
  busy: Set<string>
}

const g = globalThis as typeof globalThis & { __basketState?: State }

export const state: State = (g.__basketState ??= {
  orders: [],
  oos: [],
  cursors: new Map(),
  busy: new Set(),
})

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
