// The one place that knows where catalog + stock data comes from.
// Today: mocks/catalog.ts. Person 2 swaps this for the real catalog and the Moss index.
import { PRODUCTS, STOCK, STORES } from '../../mocks/catalog'
import type { Product, Store, StoreStock } from './types'

const productsById = new Map(PRODUCTS.map((p) => [p.id, p]))

export function allProducts(): Product[] {
  return PRODUCTS
}

export function getProduct(id: string): Product | undefined {
  return productsById.get(id)
}

export function getStock(storeId: string, productId: string): StoreStock | undefined {
  return STOCK.find((s) => s.store_id === storeId && s.product_id === productId)
}

export function allStores(): Store[] {
  return STORES
}

export function getStore(id: string): Store | undefined {
  return STORES.find((s) => s.id === id)
}
