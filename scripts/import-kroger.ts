// Imports real products for one Kroger store into data/kroger/*.json (same shape as the synthetic catalog).
// For each seed staple (scripts/seeds.ts) we search Kroger at that store and keep the top matches,
// with real brand, size, price, aisle number and stock level.
//
// Needs KROGER_CLIENT_ID / KROGER_CLIENT_SECRET. Store: KROGER_LOCATION_ID, or the nearest to KROGER_ZIP.
// Run: npm run kroger:import   (then CATALOG_SOURCE=kroger npm run moss:index)
//
// Caveats: diet tags and allergens come from the seed item we searched for (plus "organic" /
// "gluten free" in the name) — Kroger's public API doesn't return allergens. Good enough for a demo.

import { writeFileSync } from "node:fs";
import { findLocations, searchProducts, type KrogerProduct } from "../lib/kroger/client";
import type { Product, Store, StoreStock } from "../lib/types";
import { BASES, deriveDietTags, parseAllergens } from "./seeds";

const PER_TERM = Number(process.env.KROGER_PER_TERM ?? 5);
// Kroger's own brands → ranked first on substitutes, like Safeway's in the synthetic catalog.
const KROGER_BRANDS = /^(kroger|simple truth|private selection|heritage farm|comforts|home chef|smart way|psst|bakery fresh goodness|murray's)/i;

const clean = (s = "") => s.replace(/[®™©]/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pickLocation() {
  const zip = process.env.KROGER_ZIP ?? "45202"; // Cincinnati, Kroger HQ
  const locations = await findLocations(zip, 10);
  const wanted = process.env.KROGER_LOCATION_ID;
  const loc = wanted ? locations.find((l) => l.locationId === wanted) : locations[0];
  if (!loc && wanted) return { locationId: wanted, chain: "KROGER", name: `Kroger ${wanted}`, address: { addressLine1: "", city: "", state: "", zipCode: zip } };
  if (!loc) throw new Error(`No Kroger locations near ${zip}`);
  return loc;
}

function toRows(kp: KrogerProduct, base: (typeof BASES)[number], storeId: string): { product: Product; stock: StoreStock } | undefined {
  const [department, aisle, , , , tags, allergenSpec] = base;
  const item = kp.items?.[0];
  const price = item?.price && (item.price.promo > 0 ? item.price.promo : item.price.regular);
  if (!item || !price) return undefined; // not sold at this store

  const name = clean(kp.description);
  const brand = clean(kp.brand) || name.split(" ")[0];
  const allergens = parseAllergens(allergenSpec);
  const level = item.inventory?.stockLevel;
  const inStock = level ? level !== "TEMPORARILY_OUT_OF_STOCK" : item.fulfillment?.inStore !== false;
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
    diet_tags: deriveDietTags(tags, allergens, department, name),
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
  name: clean(`${loc.chain === "KROGER" ? "Kroger" : loc.chain} ${loc.name}`),
  neighborhood: [loc.address.addressLine1, loc.address.city, loc.address.state].filter(Boolean).join(", "),
};
console.log(`Store: ${store.name} (${store.id}) — ${store.neighborhood}`);

const products = new Map<string, Product>();
const stock: StoreStock[] = [];
for (const [i, base] of BASES.entries()) {
  const term = base[2];
  try {
    const found = await searchProducts(term, loc.locationId, PER_TERM);
    let kept = 0;
    for (const kp of found) {
      const rows = toRows(kp, base, store.id);
      if (!rows || products.has(rows.product.id)) continue;
      products.set(rows.product.id, rows.product);
      stock.push(rows.stock);
      kept++;
    }
    process.stdout.write(`\r[${i + 1}/${BASES.length}] ${term.padEnd(40)} +${kept}   `);
  } catch (err) {
    console.warn(`\n  ${term}: ${err instanceof Error ? err.message : err}`);
  }
  await sleep(120); // stay well inside the 10k/day Products limit and avoid bursts
}

const write = (file: string, data: unknown) =>
  writeFileSync(new URL(`../data/kroger/${file}`, import.meta.url), JSON.stringify(data, null, 1) + "\n");
write("catalog.json", [...products.values()]);
write("stock.json", stock);
write("stores.json", [store]);
const out = stock.filter((s) => !s.in_stock).length;
console.log(`\n${products.size} products, ${out} out of stock → data/kroger/`);
