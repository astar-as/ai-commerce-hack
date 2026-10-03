import { searchCatalog } from "../catalog/search.ts";
import { ALLERGENS, DIET_TAGS, type SearchCatalogInput, type SearchCatalogOutput } from "../catalog/types.ts";

export const searchCatalogTool = {
  name: "search_catalog",
  description:
    "Search the grocery store's product catalog. Use it to turn list items into real products, and to find " +
    "substitutes when an item is out of stock (pass substitute_for = the missing product id and store_id; results " +
    "keep the original's dietary profile, are in stock at that store, store brand first). Returns products with " +
    "price, aisle, stock and, for substitutes, price_diff and a short reason.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: 'What to find, e.g. "oat milk barista". Ignored when substitute_for is set.' },
      store_id: { type: "string", description: 'Store to check stock at, e.g. "safeway-sf-01".' },
      substitute_for: { type: "string", description: "Product id that is missing; it is excluded from results." },
      in_stock_only: { type: "boolean", description: "Default true when store_id is set." },
      diet: { type: "array", items: { type: "string", enum: [...DIET_TAGS] }, description: "Every tag must match." },
      exclude_allergens: { type: "array", items: { type: "string", enum: [...ALLERGENS] } },
      max_price: { type: "number" },
      limit: { type: "integer", minimum: 1, maximum: 20, description: "Default 5." },
    },
    required: ["query"],
  },
  run: (input: SearchCatalogInput): Promise<SearchCatalogOutput> => searchCatalog(input),
};
