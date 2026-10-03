// Past receipts ("the bread from two weeks ago"), from lib/tools/search_order_history (owner 2/3).
import { OUT_OF_STOCK } from "@/lib/demo-catalog";
import { searchOrderHistoryTool } from "@/lib/tools/search_order_history";
import type { SearchOrderHistoryInput } from "@/lib/types";
import type { ToolDefinition } from "./types";

export const orderHistoryTool: ToolDefinition<SearchOrderHistoryInput> = {
  name: searchOrderHistoryTool.name,
  description: searchOrderHistoryTool.description + " Then add the match with add_item and mention when they bought it.",
  input_schema: searchOrderHistoryTool.input_schema as ToolDefinition["input_schema"],
  run: async (input) => {
    const out = await searchOrderHistoryTool.run(input);
    return {
      matches: out.matches.map((m) => ({
        product_id: m.product.id,
        name: m.product.name,
        brand: m.product.brand,
        size: m.product.size,
        price_now: m.product.price,
        bought_on: m.receipt.date,
        days_ago: m.receipt.days_ago,
        times_bought: m.times_bought,
        out_of_stock_now: OUT_OF_STOCK.has(m.product.id),
      })),
      recent_receipts: out.recent_receipts,
    };
  },
};
