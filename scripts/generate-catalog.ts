// Generates a synthetic Safeway-style catalog, SF stores and per-store stock.
// Output: data/catalog.json, data/stores.json, data/stock.json (committed, so nobody else needs to run this).
// Deterministic: same seed → same data. Run: npm run catalog:generate

import { writeFileSync } from "node:fs";
import type { Product, Store, StoreStock } from "../lib/types";
import { BASES, deriveDietTags, parseAllergens } from "./seeds";

// --- seeded RNG (mulberry32) ---
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261003);
const round2 = (n: number) => Math.round(n * 100) / 100;
const toPrice = (n: number) => Math.max(0.49, Math.floor(n) + (n % 1 < 0.5 ? 0.49 : 0.99));

const STORE_BRANDS = new Set([
  "Signature Select", "Signature Farms", "Signature Cafe", "Signature Care", "O Organics", "Open Nature",
  "Lucerne", "Primo Taglio", "Waterfront Bistro", "Soleil",
]);

function parseBrands(spec: string): Array<{ brand: string; store: boolean }> {
  return spec.split("|").map((s) => {
    const trimmed = s.replace("@", "").trim();
    return { brand: trimmed, store: s.includes("@") || STORE_BRANDS.has(trimmed) };
  });
}

function buildProducts(): Product[] {
  const products: Product[] = [];
  let n = 1;
  for (const [department, aisle, name, size, price, tags, allergenSpec, brands] of BASES) {
    const allergens = parseAllergens(allergenSpec);
    for (const { brand, store } of parseBrands(brands)) {
      // Avoid "General Mills Honey Nut Cheerios"-style doubling when the name already carries the brand.
      const productName = name.toLowerCase().includes(brand.toLowerCase()) ? name : `${brand} ${name}`;
      // Store brands are cheaper, O Organics sits near national, premium brands vary up.
      const factor = store ? (brand === "O Organics" ? 0.95 + rand() * 0.1 : 0.78 + rand() * 0.1) : 0.95 + rand() * 0.35;
      products.push({
        id: `sw-${String(n++).padStart(6, "0")}`,
        name: productName,
        brand,
        store_brand: store,
        department,
        aisle,
        size,
        price: toPrice(price * factor),
        diet_tags: deriveDietTags(tags, allergens, department, productName),
        allergens,
      });
    }
  }
  return products;
}

const STORES: Store[] = [
  { id: "safeway-sf-01", name: "Safeway Market St", neighborhood: "Castro / Duboce Triangle" },
  { id: "safeway-sf-02", name: "Safeway Marina", neighborhood: "Marina" },
  { id: "safeway-sf-03", name: "Safeway Mission", neighborhood: "Bernal Heights / Mission" },
];

// Demo script guarantees (PLAN.md "Demo script"): at the main demo store, Oatly Barista is out,
// while the store-brand barista and other oat milks are on the shelf.
const DEMO_STORE = "safeway-sf-01";
const FORCE_OUT = [/^Oatly Oat Milk Barista Edition$/, /^Tillamook Sharp Cheddar/, /^Rao's Homemade Marinara/, /^Mission Corn Tortillas$/];
const FORCE_IN = [/Oat Milk/, /Barista/, /^O Organics/, /^Signature Select/];

function buildStock(products: Product[]): StoreStock[] {
  const aisles = [...new Set(products.map((p) => p.aisle))];
  const stock: StoreStock[] = [];
  for (const store of STORES) {
    // Each store numbers its aisles differently.
    const order = [...aisles].sort(() => rand() - 0.5);
    const aisleNo = new Map(order.map((a, i) => [a, String(Math.floor(i / 3) + 1)]));
    for (const p of products) {
      let inStock = rand() > 0.1; // ~10% out of stock
      if (store.id === DEMO_STORE) {
        if (FORCE_IN.some((re) => re.test(p.name))) inStock = true;
        if (FORCE_OUT.some((re) => re.test(p.name))) inStock = false;
      }
      stock.push({
        store_id: store.id,
        product_id: p.id,
        in_stock: inStock,
        qty: inStock ? 2 + Math.floor(rand() * 40) : 0,
        aisle_number: p.department === "produce" ? "Produce" : aisleNo.get(p.aisle)!,
        price: round2(p.price * (0.96 + rand() * 0.08)),
      });
    }
  }
  return stock;
}

const products = buildProducts();
const stock = buildStock(products);
const write = (file: string, data: unknown) => writeFileSync(new URL(`../data/${file}`, import.meta.url), JSON.stringify(data, null, 1) + "\n");
write("catalog.json", products);
write("stores.json", STORES);
write("stock.json", stock);

const out = stock.filter((s) => !s.in_stock).length;
console.log(`${products.length} products (${products.filter((p) => p.store_brand).length} store brand), ${STORES.length} stores, ${out}/${stock.length} out of stock`);
