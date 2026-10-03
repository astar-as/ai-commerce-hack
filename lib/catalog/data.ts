// In-memory catalog + per-store stock. Source picked by CATALOG_SOURCE:
//   "synthetic" (default) → data/*.json from scripts/generate-catalog.ts
//   "kroger"              → data/kroger/*.json from scripts/import-kroger.ts (real products, aisles, stock)
// Static JSON imports so the files get bundled (Next.js / Vercel) without fs path tricks.

import syntheticCatalog from "../../data/catalog.json";
import syntheticStock from "../../data/stock.json";
import syntheticStores from "../../data/stores.json";
import krogerCatalog from "../../data/kroger/catalog.json";
import krogerStock from "../../data/kroger/stock.json";
import krogerStores from "../../data/kroger/stores.json";
import type { Product, Store, StoreStock } from "../types";

export type CatalogSource = "synthetic" | "kroger";

export function catalogSource(): CatalogSource {
  return process.env.CATALOG_SOURCE === "kroger" ? "kroger" : "synthetic";
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
  return {
    products,
    byId: new Map(products.map((p) => [p.id, p])),
    stores,
    // Copy rows: report_oos mutates stock at runtime and must not touch the imported JSON objects.
    stock: new Map(stockRows.map((s) => [`${s.store_id}:${s.product_id}`, { ...s }])),
  };
}

function get(): Db {
  return (db ??= load());
}

export const allProducts = (): Product[] => get().products;
export const getProduct = (id: string): Product | undefined => get().byId.get(id);
export const allStores = (): Store[] => get().stores;
export const getStore = (id: string): Store | undefined => get().stores.find((s) => s.id === id);
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
