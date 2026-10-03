// Engine behind search_catalog: candidate retrieval (Moss, or local keyword fallback) →
// product filters → per-store stock → substitute ranking.

import { allProducts, getProduct, getStock } from "./data";
import { ensureMossLoaded, mossConfigured, mossSearch, type MossFilterSpec } from "./moss";
import type { DietTag, Product, SearchCatalogInput, SearchCatalogOutput, SearchResult } from "../types";

// Tags a substitute must keep when the missing product had them ("still fits my diet").
const KEEP_ON_SUBSTITUTE: DietTag[] = ["vegan", "vegetarian", "gluten_free", "dairy_free", "nut_free"];

export class SearchError extends Error {
  constructor(
    readonly code: "not_found" | "invalid_input",
    message: string,
  ) {
    super(message);
  }
}

type Candidate = { product: Product; score: number };

// --- local fallback: keyword overlap, good enough when Moss keys aren't set ---

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/(es|s)$/, ""));

function matchesFilter(p: Product, { diet = [], excludeAllergens = [], department }: MossFilterSpec): boolean {
  return (
    diet.every((t) => p.diet_tags.includes(t)) &&
    !excludeAllergens.some((a) => p.allergens.includes(a)) &&
    (!department || p.department === department)
  );
}

function localSearch(query: string, topK: number, filter: MossFilterSpec): Array<{ id: string; score: number }> {
  const q = tokenize(query);
  if (q.length === 0) return [];
  return allProducts()
    .filter((p) => matchesFilter(p, filter))
    .map((p) => {
      const name = new Set(tokenize(p.name));
      const rest = new Set(tokenize(`${p.aisle} ${p.department} ${p.diet_tags.join(" ")}`));
      const hits = q.reduce((sum, t) => sum + (name.has(t) ? 1 : rest.has(t) ? 0.4 : 0), 0);
      return { id: p.id, score: hits / q.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// --- public entry point ---

// Call once at server start (e.g. Next.js instrumentation.ts) so the first shopper search
// doesn't pay the one-time Moss index download (~4 s). Warm queries take ~2 ms.
export async function warmSearch(): Promise<void> {
  if (mossConfigured()) await ensureMossLoaded();
}

export async function searchCatalog(input: SearchCatalogInput): Promise<SearchCatalogOutput> {
  await warmSearch(); // no-op once loaded; keeps the load out of took_ms
  const started = performance.now();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  const original = input.substitute_for ? getProduct(input.substitute_for) : undefined;
  if (input.substitute_for && !original) throw new SearchError("not_found", `Unknown product id ${input.substitute_for}`);
  if (!input.query?.trim() && !original) throw new SearchError("invalid_input", "query is required");

  // When substituting: keep the original's dietary profile and department, and search on its
  // generic name (brand stripped) so other brands of the same thing come first.
  const keptTags = original ? KEEP_ON_SUBSTITUTE.filter((t) => original.diet_tags.includes(t)) : [];
  const diet = [...new Set([...(input.diet ?? []), ...keptTags])];
  const filter: MossFilterSpec = { diet, excludeAllergens: input.exclude_allergens, department: original?.department };
  const query = original ? original.name.replace(original.brand, "").trim() : input.query.trim();

  const useMoss = mossConfigured();
  const topK = Math.max(limit * 6, 30); // over-fetch: stock and price filters run after retrieval
  const hits = useMoss ? await mossSearch(query, topK, filter) : localSearch(query, topK, filter);

  const inStockOnly = input.in_stock_only ?? Boolean(input.store_id);
  const candidates: Array<Candidate & { rank: number }> = [];
  hits.forEach((h, rank) => {
    const product = getProduct(h.id);
    if (!product || product.id === original?.id) return;
    if (input.max_price !== undefined && product.price > input.max_price) return;
    if (input.store_id && inStockOnly && !getStock(input.store_id, product.id)?.in_stock) return;
    candidates.push({ product, score: h.score, rank });
  });

  // Search relevance from rank (Moss orders by hybrid relevance; its score is vector-only).
  const relevance = (rank: number) => 1 - rank / hits.length;
  const rankScore = (c: Candidate & { rank: number }) => {
    if (!original) return relevance(c.rank);
    const priceDiff = Math.abs(c.product.price - original.price) / Math.max(original.price, 1);
    return (
      relevance(c.rank) +
      (c.product.store_brand ? 0.25 : 0) +
      (c.product.aisle === original.aisle ? 0.2 : 0) -
      Math.min(priceDiff, 1) * 0.2
    );
  };
  candidates.sort((a, b) => rankScore(b) - rankScore(a));

  const results: SearchResult[] = candidates.slice(0, limit).map((c) => {
    const stock = input.store_id ? getStock(input.store_id, c.product.id) : undefined;
    const storePrice = stock?.price ?? c.product.price;
    const originalPrice = original && input.store_id ? (getStock(input.store_id, original.id)?.price ?? original.price) : original?.price;
    return {
      product: c.product,
      score: Math.round(c.score * 1000) / 1000,
      ...(stock && { stock }),
      ...(originalPrice !== undefined && { price_diff: Math.round((storePrice - originalPrice) * 100) / 100 }),
      ...(original && { reason: substituteReason(c.product, original, keptTags, stock?.aisle_number) }),
    };
  });

  return { results, took_ms: Math.round((performance.now() - started) * 10) / 10, engine: useMoss ? "moss" : "local" };
}

function substituteReason(p: Product, original: Product, keptTags: DietTag[], aisleNumber?: string): string {
  const parts: string[] = [];
  if (p.store_brand) parts.push("Store brand");
  if (p.aisle === original.aisle) parts.push(aisleNumber ? `same aisle (${aisleNumber})` : "same aisle");
  else if (aisleNumber) parts.push(`aisle ${aisleNumber}`);
  // "vegan" already implies vegetarian + dairy-free; don't repeat them.
  const shown = keptTags.includes("vegan") ? keptTags.filter((t) => t !== "vegetarian" && t !== "dairy_free") : keptTags;
  parts.push(...shown.map((t) => t.replace("_", "-")));
  return parts.join(" · ");
}
