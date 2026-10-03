// Moss search over the product catalog. One product-level index; per-store stock is applied in
// our code (lib/catalog/search.ts) so out-of-stock reports take effect without reindexing.
// Moss metadata values are strings, and metadata filters need the index loaded locally (loadIndex).

import { MossClient, type DocumentInfo } from "@moss-js/moss";
import { ALLERGENS, DIET_TAGS, type Allergen, type DietTag, type Product } from "../types";
import { catalogSource } from "./data";

export function mossConfigured(): boolean {
  return Boolean(process.env.MOSS_PROJECT_ID && process.env.MOSS_PROJECT_KEY);
}

export function mossIndexName(): string {
  return process.env.MOSS_INDEX || `${catalogSource()}-catalog`;
}

let client: MossClient | undefined;
export function mossClient(): MossClient {
  return (client ??= new MossClient(process.env.MOSS_PROJECT_ID!, process.env.MOSS_PROJECT_KEY!));
}

export function productToDoc(p: Product): DocumentInfo {
  const metadata: Record<string, string> = {
    brand: p.brand,
    department: p.department,
    aisle: p.aisle,
    store_brand: String(p.store_brand),
    price: p.price.toFixed(2),
  };
  // One boolean field per tag/allergen keeps filters to simple $eq conditions.
  for (const tag of DIET_TAGS) metadata[`diet_${tag}`] = String(p.diet_tags.includes(tag));
  for (const a of ALLERGENS) metadata[`allergen_${a}`] = String(p.allergens.includes(a));
  return {
    id: p.id,
    text: [p.name, p.brand, p.aisle, p.department, p.size, ...p.diet_tags.map((t) => t.replace("_", " "))].join(". "),
    metadata,
  };
}

export type MossFilterSpec = { diet?: DietTag[]; excludeAllergens?: Allergen[]; department?: string };

export function buildFilter({ diet = [], excludeAllergens = [], department }: MossFilterSpec) {
  const conditions = [
    ...diet.map((t) => ({ field: `diet_${t}`, condition: { $eq: "true" } })),
    ...excludeAllergens.map((a) => ({ field: `allergen_${a}`, condition: { $eq: "false" } })),
    ...(department ? [{ field: "department", condition: { $eq: department } }] : []),
  ];
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

let loaded: Promise<unknown> | undefined;
export function ensureMossLoaded(): Promise<unknown> {
  // Cache the promise, but drop it on failure so the next request retries.
  loaded ??= mossClient()
    .loadIndex(mossIndexName())
    .catch((err) => {
      loaded = undefined;
      throw err;
    });
  return loaded;
}

export async function mossSearch(query: string, topK: number, filter: MossFilterSpec) {
  await ensureMossLoaded();
  const res = await mossClient().query(mossIndexName(), query, { topK, alpha: 0.6, filter: buildFilter(filter) });
  return res.docs.map((d) => ({ id: d.id, score: d.score }));
}
