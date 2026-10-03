import { allProducts, defaultStore, getProduct, getStock } from "@/lib/catalog/data";

const store = defaultStore();

export const DEMO_STORE = { id: store.id, name: store.name };

export const OUT_OF_STOCK = {
  has: (id: string) => getStock(store.id, id)?.in_stock === false,
};

export const CATALOG = allProducts();

export const productById = (id: string) => getProduct(id);
