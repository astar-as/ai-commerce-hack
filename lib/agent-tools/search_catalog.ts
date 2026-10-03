// Agent-facing catalog search over the store catalog the screen uses (lib/demo-catalog.ts), so
// every product id the agent picks renders in the order view. When data-search (owner 2) merges,
// swap the matching below for lib/catalog search; the profile filter and output stay.
import { CATALOG, DEMO_STORE, OUT_OF_STOCK } from "@/lib/demo-catalog";
import { findSubstitutes } from "@/lib/order";
import { profileViolations } from "@/lib/profile/guard";
import type { Allergen, DietTag, Product } from "@/lib/types";
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
  took_ms: number;
};

const DIET_TAGS: DietTag[] = ["vegan", "vegetarian", "gluten_free", "dairy_free", "nut_free", "organic", "kosher"];
const ALLERGENS: Allergen[] = ["milk", "eggs", "peanuts", "tree_nuts", "soy", "wheat", "fish", "shellfish", "sesame"];

const tokens = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((t) => t.length > 1);

function score(q: string[], p: Product): number {
  const hay = tokens(`${p.name} ${p.brand} ${p.department} ${p.diet_tags.join(" ")}`);
  let s = 0;
  for (const t of q) {
    if (hay.includes(t)) s += 1;
    else if (hay.some((h) => h.startsWith(t) || t.startsWith(h))) s += 0.6;
  }
  return q.length ? s / q.length : 0;
}

const hit = (p: Product, extra: Partial<Hit> = {}): Hit => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  store_brand: p.store_brand,
  size: p.size,
  price: p.price,
  aisle: p.aisle,
  in_stock: !OUT_OF_STOCK.has(p.id),
  ...extra,
});

export async function agentSearch(input: AgentSearchInput, ctx: ToolContext): Promise<AgentSearchOutput> {
  const started = performance.now();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
  const hidden: AgentSearchOutput["hidden_by_profile"] = [];
  const allowed = (p: Product) => {
    const why = profileViolations(p, ctx.profile);
    if (why.length) hidden.push({ name: p.name, why });
    const oneOff =
      (input.diet ?? []).every((d) => p.diet_tags.includes(d)) &&
      !(input.exclude_allergens ?? []).some((a) => p.allergens.includes(a));
    return why.length === 0 && oneOff;
  };

  let results: Hit[];
  if (input.substitute_for) {
    const missing = CATALOG.find((p) => p.id === input.substitute_for);
    if (!missing) throw new AgentToolError("not_found", `unknown product ${input.substitute_for}`);
    results = findSubstitutes(missing, 10)
      .filter((s) => allowed(s.product))
      .map((s) => hit(s.product, { price_diff: s.price_diff, reason: s.reason }));
  } else {
    if (!input.query?.trim()) throw new AgentToolError("invalid_input", "query is required");
    const q = tokens(input.query);
    results = CATALOG.map((p) => ({ p, s: score(q, p) }))
      .filter(({ s }) => s > 0.3)
      .filter(({ p }) => allowed(p))
      .sort((a, b) => b.s - a.s || Number(b.p.store_brand) - Number(a.p.store_brand))
      .map(({ p }) => hit(p));
  }

  return {
    store: DEMO_STORE.name,
    results: results.slice(0, limit),
    hidden_by_profile: hidden.slice(0, 5),
    took_ms: Math.round((performance.now() - started) * 100) / 100,
  };
}

export const searchCatalogTool: ToolDefinition<AgentSearchInput, AgentSearchOutput> = {
  name: "search_catalog",
  description:
    "Search the store's catalog. Call it for each item the shopper wants (\"oat milk\", \"pasta sauce\") and only " +
    "use product ids it returns. The household's allergens and diet are applied automatically; " +
    "hidden_by_profile lists matches removed for safety, so you can say why. To find a replacement for a " +
    "missing item, pass substitute_for with its id: results put store brands first, with price_diff. " +
    "If nothing fits, the store doesn't carry it: say so.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: 'What to find, e.g. "oat milk barista". Ignored with substitute_for.' },
      substitute_for: { type: "string", description: "Product id of the missing item." },
      diet: { type: "array", items: { type: "string", enum: DIET_TAGS }, description: "Extra one-off limits." },
      exclude_allergens: { type: "array", items: { type: "string", enum: ALLERGENS }, description: "Extra one-off limits." },
      limit: { type: "integer", minimum: 1, maximum: 20, description: "Default 5." },
    },
    required: ["query"],
  },
  run: agentSearch,
};
