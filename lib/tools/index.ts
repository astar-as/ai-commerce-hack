// Tool registry. The same functions back the ZooWork custom tools and POST /api/tools/<name>.
import { checkStockTool } from './check_stock'
import { createPickupOrderTool } from './create_pickup_order'
import { getFulfillmentOptionsTool } from './get_fulfillment_options'
import { reportOosTool } from './report_oos'
import { searchCatalogTool } from './search_catalog'
import { sendToInstacartTool } from './send_to_instacart'
import { getProfileTool, updateProfileTool } from './profile_tools'
import { ToolError, type ToolContext, type ToolDefinition } from './types'

export const TOOLS: ToolDefinition[] = [
  searchCatalogTool,
  checkStockTool,
  getFulfillmentOptionsTool,
  createPickupOrderTool,
  sendToInstacartTool,
  reportOosTool,
  getProfileTool,
  updateProfileTool,
]

const byName = new Map(TOOLS.map((t) => [t.name, t]))

export type ToolResult =
  | { ok: true; output: unknown }
  | { ok: false; error: { code: string; message: string } }

export async function runTool(name: string, input: unknown, ctx: ToolContext = {}): Promise<ToolResult> {
  const tool = byName.get(name)
  if (!tool) return { ok: false, error: { code: 'not_found', message: `unknown tool ${name}` } }
  try {
    return { ok: true, output: await tool.run((input ?? {}) as never, ctx) }
  } catch (err) {
    if (err instanceof ToolError) return { ok: false, error: { code: err.code, message: err.message } }
    console.error(`[tool ${name}]`, err)
    return { ok: false, error: { code: 'upstream_failed', message: (err as Error).message ?? 'tool failed' } }
  }
}
