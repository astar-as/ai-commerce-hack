// GET /api/orders[?store_id=…]  — orders the agent placed (pickup orders + Instacart handoffs),
// newest first. The store screen polls this to show a pickup order arriving live.
import { state } from '@/lib/store/memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get('store_id')
  const orders = storeId ? state.orders.filter((o) => o.kind === 'pickup' && o.store_id === storeId) : state.orders
  return Response.json({ orders })
}
