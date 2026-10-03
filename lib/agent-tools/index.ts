// The ZooWork agent's custom tools. Declared on the agent by lib/zoowork/agent-config.ts and run by
// lib/zoowork/turn.ts with the turn's context (household profile + current order).
// Catalog tools for the frontend live in lib/tools (data-search, owner 2).
import { checkoutTool } from "./checkout";
import { orderHistoryTool } from "./order_history";
import { ORDER_TOOLS } from "./order_tools";
import { updateProfileTool } from "./profile_tools";
import { searchCatalogTool } from "./search_catalog";
import { AgentToolError, type ToolContext, type ToolDefinition } from "./types";

export const AGENT_TOOLS: ToolDefinition[] = [searchCatalogTool, orderHistoryTool, ...ORDER_TOOLS, checkoutTool, updateProfileTool];

const byName = new Map(AGENT_TOOLS.map((t) => [t.name, t]));

export type ToolResult = { ok: true; output: unknown } | { ok: false; error: { code: string; message: string } };

export async function runAgentTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const tool = byName.get(name);
  if (!tool) return { ok: false, error: { code: "not_found", message: `unknown tool ${name}` } };
  try {
    return { ok: true, output: await tool.run((input ?? {}) as never, ctx) };
  } catch (err) {
    if (err instanceof AgentToolError) return { ok: false, error: { code: err.code, message: err.message } };
    console.error(`[agent tool ${name}]`, err);
    return { ok: false, error: { code: "upstream_failed", message: (err as Error).message ?? "tool failed" } };
  }
}
