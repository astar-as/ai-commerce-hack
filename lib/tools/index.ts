// Tool registry: one place for both callers in PLAN.md "How the tools are wired".
//   ZooWork agent: createAgent({ resource: { custom_tools: zooworkCustomTools() } }), then on
//                  agent.custom_tool_use → runTool(call.name, call.input) → resolveCustomToolCall(...)
//                  (resolve with is_error: true when the result has an `error` key).
//   Frontend:      POST /api/tools/<name> → runTool(name, body).
// report_oos gets added here by its owner.

import checkStockMock from "../../mocks/check_stock.json";
import searchCatalogMock from "../../mocks/search_catalog.json";
import { SearchError } from "../catalog/search";
import type { ToolError } from "../types";
import { checkStockTool } from "./check_stock";
import { matchIngredientsTool } from "./match_ingredients";
import { searchCatalogTool } from "./search_catalog";
import { searchOrderHistoryTool } from "./search_order_history";
import { sendToInstacartTool } from "./send_to_instacart";

type Tool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  run: (input: any) => Promise<unknown>;
};

const TOOLS: Record<string, Tool> = {
  [searchCatalogTool.name]: searchCatalogTool,
  [checkStockTool.name]: checkStockTool,
  [matchIngredientsTool.name]: matchIngredientsTool,
  [sendToInstacartTool.name]: sendToInstacartTool, // handles MOCK_TOOLS itself (mock cart)
  [searchOrderHistoryTool.name]: searchOrderHistoryTool,
};

const MOCKS: Record<string, unknown> = {
  search_catalog: searchCatalogMock,
  check_stock: checkStockMock,
};

export function zooworkCustomTools() {
  return Object.values(TOOLS).map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

export async function runTool(name: string, input: unknown): Promise<unknown | ToolError> {
  const tool = TOOLS[name];
  if (!tool) return { error: { code: "not_found", message: `Unknown tool ${name}` } };
  if (process.env.MOCK_TOOLS === "1" && MOCKS[name]) return MOCKS[name];
  if (!input || typeof input !== "object") return { error: { code: "invalid_input", message: "input must be an object" } };
  try {
    return await tool.run(input);
  } catch (err) {
    if (err instanceof SearchError) return { error: { code: err.code, message: err.message } };
    return { error: { code: "upstream_failed", message: err instanceof Error ? err.message : String(err) } };
  }
}

export const isToolError = (r: unknown): r is ToolError => typeof r === "object" && r !== null && "error" in r;
