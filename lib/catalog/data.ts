// In-memory catalog + per-store stock. Source picked by CATALOG_SOURCE:
//   "kroger" (default) → data/kroger/*.json from scripts/import-kroger.ts (real products, aisles, stock)
//                        + data/kroger/demo.json overrides (guaranteed demo out-of-stock)
//   "synthetic"        → data/*.json from scripts/generate-catalog.ts (offline Safeway-style fallback)
// Static JSON imports so the files get bundled (Next.js / Vercel) without fs path tricks.

import syntheticCatalog from "../../data/catalog.json";
import syntheticStock from "../../data/stock.json";
import syntheticStores from "../../data/stores.json";
import krogerCatalog from "../../data/kroger/catalog.json";
import krogerStock from "../../data/kroger/stock.json";
import krogerStores from "../../data/kroger/stores.json";
import krogerDemo from "../../data/kroger/demo.json";
import type { Product, Store, StoreStock } from "../types";

export type CatalogSource = "synthetic" | "kroger";

export function catalogSource(): CatalogSource {
  return process.env.CATALOG_SOURCE === "synthetic" ? "synthetic" : "kroger";
}

type Db = {
  products: Product[];
  byId: Map<string, Product>;
  stores: Store[];
  stock: Map<string, StoreStock>; // key: `${store_id}:${product_id}`
};

let db: Db | undefined;

function load(): Db {
  const kroger = catalogSource() === "kroger";
  const products = (kroger ? krogerCatalog : syntheticCatalog) as Product[];
  const stores = (kroger ? krogerStores : syntheticStores) as Store[];
  const stockRows = (kroger ? krogerStock : syntheticStock) as StoreStock[];
  if (products.length === 0) throw new Error(`Catalog "${catalogSource()}" is empty — run the import script first`);
  // Copy rows: report_oos mutates stock at runtime and must not touch the imported JSON objects.
  const stock = new Map(stockRows.map((s) => [`${s.store_id}:${s.product_id}`, { ...s }]));
  if (kroger) {
    for (const row of stock.values()) {
      if (krogerDemo.out_of_stock.includes(row.product_id)) Object.assign(row, { in_stock: false, qty: 0 });
    }
  }
  return { products, byId: new Map(products.map((p) => [p.id, p])), stores, stock };
}

function get(): Db {
  return (db ??= load());
}

export const allProducts = (): Product[] => get().products;
export const getProduct = (id: string): Product | undefined => get().byId.get(id);
export const allStores = (): Store[] => get().stores;
export const getStore = (id: string): Store | undefined => get().stores.find((s) => s.id === id);
// The store the demo runs against ("kroger-01400513" on the Kroger catalog).
export const defaultStore = (): Store => get().stores[0];
export const getStock = (storeId: string, productId: string): StoreStock | undefined =>
  get().stock.get(`${storeId}:${productId}`);

// For report_oos: a shopper saw the shelf empty, so trust that over our snapshot.
export function markOutOfStock(storeId: string, productId: string): StoreStock | undefined {
  const row = getStock(storeId, productId);
  if (row) {
    row.in_stock = false;
    row.qty = 0;
  }
  return row;
}

// Tests only.
export function resetCatalog(): void {
  db = undefined;
}
