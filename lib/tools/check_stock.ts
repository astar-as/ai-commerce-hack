import { getProduct, getStock, getStore } from "../catalog/data.ts";
import { SearchError } from "../catalog/search.ts";
import type { CheckStockInput, CheckStockOutput, StoreStock } from "../catalog/types.ts";

export async function checkStock({ store_id, product_ids }: CheckStockInput): Promise<CheckStockOutput> {
  if (!getStore(store_id)) throw new SearchError("not_found", `Unknown store ${store_id}`);
  if (!Array.isArray(product_ids) || product_ids.length > 100)
    throw new SearchError("invalid_input", "product_ids must be an array of at most 100 ids");

  const items: StoreStock[] = [];
  const unknown_ids: string[] = [];
  for (const id of product_ids) {
    const row = getProduct(id) && getStock(store_id, id);
    if (row) items.push({ ...row });
    else unknown_ids.push(id);
  }
  return { store_id, items, unknown_ids };
}

export const checkStockTool = {
  name: "check_stock",
  description:
    "Check stock, aisle number and store price for a list of product ids at one store. Use it to sort a " +
    "shopping list by aisle and to flag items that are out before the shopper leaves home.",
  input_schema: {
    type: "object",
    properties: {
      store_id: { type: "string", description: 'e.g. "safeway-sf-01"' },
      product_ids: { type: "array", items: { type: "string" }, maxItems: 100 },
    },
    required: ["store_id", "product_ids"],
  },
  run: checkStock,
};
