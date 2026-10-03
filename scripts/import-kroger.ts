// Imports real products for one Kroger store into data/kroger/*.json (same shape as the synthetic catalog).
// For each seed staple (scripts/seeds.ts) we search Kroger at that store and keep the top matches,
// with real brand, size, price, aisle number and stock level.
//
// Needs KROGER_CLIENT_ID / KROGER_CLIENT_SECRET. Store: KROGER_LOCATION_ID, or the nearest to KROGER_ZIP.
// Run: npm run kroger:import   (then CATALOG_SOURCE=kroger npm run moss:index)
//
// Allergens and diet tags come from Kroger's own data (allergens + manufacturerDeclarations) when the
// product has it; otherwise we fall back to the seed item we searched for.

import { writeFileSync } from "node:fs";
import { findLocations, searchProducts, type KrogerProduct } from "../lib/kroger/client";
import type { Allergen, DietTag, Product, Store, StoreStock } from "../lib/types";
import { BASES, NON_FOOD_DEPARTMENTS, RECIPE_BASES, parseAllergens, parseTags } from "./seeds";

const PER_TERM = Number(process.env.KROGER_PER_TERM ?? 5);
// Kroger's own brands → ranked first on substitutes, like Safeway's in the synthetic catalog.
const KROGER_BRANDS = /^(kroger|simple truth|private selection|heritage farm|comforts|home chef|smart way|psst|bakery fresh goodness|murray's)/i;

// Kroger allergen names → ours. "May contain" counts: for an allergy, a maybe is a no.
const ALLERGEN_PATTERNS: Array<[RegExp, Allergen]> = [
  [/^milk|lactose/i, "milk"], [/^egg/i, "eggs"], [/^peanut/i, "peanuts"], [/tree nut|pine nut/i, "tree_nuts"],
  [/^soy/i, "soy"], [/^wheat/i, "wheat"], [/^fish/i, "fish"], [/crustacean|shrimp|shellfish|mollusc/i, "shellfish"],
  [/^sesame/i, "sesame"],
];
const PRESENT = new Set(["Contains", "May contain", "Derived From"]);
const DECLARED: Record<string, DietTag> = { Vegan: "vegan", Kosher: "kosher", "Gluten Free": "gluten_free", Organic: "organic", "Dairy Free": "dairy_free" };

function krogerAllergens(kp: KrogerProduct, fallback: Allergen[]): Allergen[] {
  if (!kp.allergens?.length) return fallback;
  const found = new Set<Allergen>();
  for (const a of kp.allergens) {
    if (!PRESENT.has(a.levelOfContainmentName)) continue;
    const hit = ALLERGEN_PATTERNS.find(([re]) => re.test(a.name));
    if (hit) found.add(hit[1]);
  }
  return [...found];
}

function krogerDiet(kp: KrogerProduct, baseTags: string, allergens: Allergen[], department: string, name: string): DietTag[] {
  const declared = (kp.manufacturerDeclarations ?? []).map((d) => DECLARED[d]).filter(Boolean);
  const base = parseTags(baseTags);
  // With real declarations, only claim vegan/gluten-free/kosher/organic when Kroger says so.
  const diet = new Set<DietTag>(declared.length ? [...declared, ...base.filter((t) => t === "vegetarian")] : base);
  if (/organic/i.test(name)) diet.add("organic");
  if (/gluten[- ]free/i.test(name)) diet.add("gluten_free");
  if (diet.has("vegan")) diet.add("vegetarian");
  if (!NON_FOOD_DEPARTMENTS.has(department)) {
    if (!allergens.includes("milk")) diet.add("dairy_free");
    else diet.delete("dairy_free");
    if (!allergens.includes("peanuts") && !allergens.includes("tree_nuts")) diet.add("nut_free");
  }
  return [...diet].sort();
}

const clean = (s = "") => s.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Kroger's API has short outages (404/503 from its gateway): retry before giving up on a term.
async function searchWithRetry(term: string, locationId: string, limit: number) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await searchProducts(term, locationId, limit);
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(1000 * attempt);
    }
  }
}

async function pickLocation() {
  const zip = process.env.KROGER_ZIP ?? "45202"; // Cincinnati, Kroger HQ
  const locations = await findLocations(zip, 10);
  const wanted = process.env.KROGER_LOCATION_ID;
  const loc = wanted ? locations.find((l) => l.locationId === wanted) : (locations.find((l) => l.chain === "KROGER") ?? locations[0]);
  if (!loc && wanted) return { locationId: wanted, chain: "KROGER", name: `Kroger ${wanted}`, address: { addressLine1: "", city: "", state: "", zipCode: zip } };
  if (!loc) throw new Error(`No Kroger locations near ${zip}`);
  return loc;
}

function toRows(kp: KrogerProduct, base: (typeof BASES)[number], storeId: string): { product: Product; stock: StoreStock } | undefined {
  const [department, aisle, , , , tags, allergenSpec] = base;
  const item = kp.items?.[0];
  const price = item?.price && (item.price.promo > 0 && item.price.promo < item.price.regular ? item.price.promo : item.price.regular);
  if (!item || !price) return undefined; // not sold at this store
  // Online-only items (ship-to-home etc.) aren't on this store's shelves — not useful in store.
  if (item.fulfillment?.inStore === false && !kp.aisleLocations?.length) return undefined;

  const name = clean(kp.description);
  const brand = clean(kp.brand) || name.split(" ")[0];
  const allergens = krogerAllergens(kp, parseAllergens(allergenSpec));
  const level = item.inventory?.stockLevel;
  const inStock = level !== "TEMPORARILY_OUT_OF_STOCK";
  const image = kp.images?.find((i) => i.featured) ?? kp.images?.[0];

  const product: Product = {
    id: `kr-${kp.productId}`,
    name,
    brand,
    store_brand: KROGER_BRANDS.test(brand),
    department,
    aisle,
    size: clean(item.size) || "each",
    price,
    diet_tags: krogerDiet(kp, tags, allergens, department, name),
    allergens,
    upc: kp.upc,
    image_url: image?.sizes.find((s) => s.size === "medium")?.url ?? image?.sizes[0]?.url,
  };
  const stock: StoreStock = {
    store_id: storeId,
    product_id: product.id,
    in_stock: inStock,
    qty: !inStock ? 0 : level === "LOW" ? 3 : 20,
    aisle_number: kp.aisleLocations?.[0]?.number ?? clean(kp.aisleLocations?.[0]?.description) ?? "",
    price,
  };
  return { product, stock };
}

const loc = await pickLocation();
const store: Store = {
  id: `kroger-${loc.locationId}`,
  name: clean(loc.name).replace(/^Kroger - /, ""),
  neighborhood: [loc.address.addressLine1, loc.address.city, loc.address.state].filter(Boolean).join(", "),
};
console.log(`Store: ${store.name} (${store.id}) — ${store.neighborhood}`);

const products = new Map<string, Product>();
const stock: StoreStock[] = [];
const TERMS = [...BASES, ...RECIPE_BASES];
let failed = 0;
for (const [i, base] of TERMS.entries()) {
  const term = base[2];
  try {
    const found = await searchWithRetry(term, loc.locationId, PER_TERM);
    let kept = 0;
    for (const kp of found) {
      const rows = toRows(kp, base, store.id);
      if (!rows || products.has(rows.product.id)) continue;
      products.set(rows.product.id, rows.product);
      stock.push(rows.stock);
      kept++;
    }
    console.log(`[${i + 1}/${TERMS.length}] ${term} +${kept}`);
  } catch (err) {
    failed++;
    console.warn(`  ${term}: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
  }
  await sleep(120); // stay well inside the 10k/day Products limit and avoid bursts
}

// Never overwrite a good catalog with a broken one.
if (failed > TERMS.length / 4) {
  console.error(`${failed}/${TERMS.length} searches failed (Kroger outage?) — not writing data/kroger/. Try again later.`);
  process.exit(1);
}

const write = (file: string, data: unknown) =>
  writeFileSync(new URL(`../data/kroger/${file}`, import.meta.url), JSON.stringify(data, null, 1) + "\n");
write("catalog.json", [...products.values()]);
write("stock.json", stock);
write("stores.json", [store]);
const out = stock.filter((s) => !s.in_stock).length;
console.log(`\n${products.size} products, ${out} out of stock → data/kroger/`);
