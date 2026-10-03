// Agent-facing catalog search on lib/catalog/search (Moss when configured, local fallback otherwise),
// over the same catalog the order screen renders. The household profile's allergens and diet go into
// the search filter; a second unfiltered query tells the agent what was hidden and why.
import { searchCatalog } from "@/lib/catalog/search";
import { DEMO_STORE } from "@/lib/demo-catalog";
import { profileViolations } from "@/lib/profile/guard";
import { ALLERGENS, DIET_TAGS, type Allergen, type DietTag, type SearchResult } from "@/lib/types";
import { AgentToolError, type ToolContext, type ToolDefinition } from "./types";

export type AgentSearchInput = {
  query: string;
  substitute_for?: string;
  diet?: DietTag[];
  exclude_allergens?: Allergen[];
  limit?: number;
};

type Hit = {
  id: string;
  name: string;
  brand: string;
  store_brand: boolean;
  size: string;
  price: number;
  aisle: string;
  in_stock: boolean;
  price_diff?: number;
  reason?: string;
};

export type AgentSearchOutput = {
  store: string;
  results: Hit[];
  // Matches removed because of the household profile, so the agent can say why.
  hidden_by_profile: Array<{ name: string; why: string[] }>;
  engine?: "moss" | "local";
  took_ms: number;
};

const hit = (r: SearchResult): Hit => ({
  id: r.product.id,
  name: r.product.name,
  brand: r.product.brand,
  store_brand: r.product.store_brand,
  size: r.product.size,
  price: r.stock?.price ?? r.product.price,
  aisle: r.stock?.aisle_number ?? r.product.aisle,
  in_stock: r.stock?.in_stock ?? true,
  ...(r.price_diff !== undefined && { price_diff: r.price_diff }),
  ...(r.reason && { reason: r.reason }),
});

export async function agentSearch(input: AgentSearchInput, ctx: ToolContext): Promise<AgentSearchOutput> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
  const base = {
    query: input.query ?? "",
    substitute_for: input.substitute_for,
    store_id: DEMO_STORE.id,
    // Substitutes must be on the shelf; plain searches show out-of-stock items so the agent can offer a swap.
    in_stock_only: Boolean(input.substitute_for),
    limit,
  };
  const diet = [...new Set([...(ctx.profile?.diet ?? []), ...(input.diet ?? [])])];
  const exclude_allergens = [...new Set([...(ctx.profile?.allergens ?? []), ...(input.exclude_allergens ?? [])])];

  try {
    const [safe, all] = await Promise.all([
      searchCatalog({ ...base, diet, exclude_allergens }),
      ctx.profile ? searchCatalog(base) : Promise.resolve(undefined),
    ]);
    // Belt and braces: the filter already applied the profile, the guard checks again.
    const results = safe.results.filter((r) => profileViolations(r.product, ctx.profile).length === 0);
    const hidden = (all?.results ?? [])
      .map((r) => ({ name: r.product.name, why: profileViolations(r.product, ctx.profile) }))
      .filter((h) => h.why.length > 0);
    return { store: DEMO_STORE.name, results: results.map(hit), hidden_by_profile: hidden.slice(0, 5), engine: safe.engine, took_ms: safe.took_ms };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    throw new AgentToolError(e.code === "not_found" || e.code === "invalid_input" ? e.code : "upstream_failed", e.message ?? "search failed");
  }
}

export const searchCatalogTool: ToolDefinition<AgentSearchInput, AgentSearchOutput> = {
  name: "search_catalog",
  description:
    "Search the store's catalog. Call it for each item the shopper wants (\"oat milk\", \"pasta sauce\") and only " +
    "use product ids it returns. The household's allergens and diet are applied automatically; " +
    "hidden_by_profile lists matches removed for safety, so you can say why. Results show in_stock: for an " +
    "out-of-stock item, add it and propose_swap. To find a replacement, pass substitute_for with the missing " +
    "id: results are in stock, store brand first, with price_diff. If nothing fits, the store doesn't carry it.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: 'What to find, e.g. "oat milk barista". Ignored with substitute_for.' },
      substitute_for: { type: "string", description: "Product id of the missing item." },
      diet: { type: "array", items: { type: "string", enum: [...DIET_TAGS] }, description: "Extra one-off limits." },
      exclude_allergens: { type: "array", items: { type: "string", enum: [...ALLERGENS] }, description: "Extra one-off limits." },
      limit: { type: "integer", minimum: 1, maximum: 20, description: "Default 5." },
    },
    required: ["query"],
  },
  run: agentSearch,
};
