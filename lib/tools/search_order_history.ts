import { searchOrderHistory } from "@/lib/history/search";
import type { SearchOrderHistoryInput, SearchOrderHistoryOutput } from "@/lib/types";

export const searchOrderHistoryTool = {
  name: "search_order_history",
  description:
    "Search the shopper's past receipts (orders and in-store purchases at this store, last ~2 months). Use it when " +
    'the shopper refers to something they bought before ("that really good bread from two weeks ago", "my usual ' +
    'oat milk", "what I got last time"). Pass short product words as query (e.g. "bread", "oat milk"), not adjectives, ' +
    "and days_ago when they mention a time. Returns matching products with the receipt date, how many times they " +
    "bought it and when last; re-add a match to the order with its product id. Without query it lists recent receipts.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: 'Product words, e.g. "bread", "oat milk", "coffee".' },
      days_ago: { type: "integer", minimum: 0, description: 'Approximate age of the purchase, e.g. 14 for "two weeks ago".' },
      window_days: { type: "integer", minimum: 0, description: "How far from days_ago to look. Default ~35% of days_ago, min 3." },
      limit: { type: "integer", minimum: 1, maximum: 20, description: "Default 5." },
    },
    required: [],
  },
  run: async (input: SearchOrderHistoryInput): Promise<SearchOrderHistoryOutput> => searchOrderHistory(input),
};
