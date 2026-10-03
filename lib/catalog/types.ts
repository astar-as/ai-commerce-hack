// Shared types — the contract from PLAN.md "Tool interfaces". Keep in sync with the plan.

export const DIET_TAGS = ["vegan", "vegetarian", "gluten_free", "dairy_free", "nut_free", "organic", "kosher"] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export const ALLERGENS = ["milk", "eggs", "peanuts", "tree_nuts", "soy", "wheat", "fish", "shellfish", "sesame"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type Product = {
  id: string; // our catalog id, e.g. "sw-000123" (not an Instacart id)
  name: string; // "O Organics Oat Milk Original"
  brand: string; // "O Organics"
  store_brand: boolean; // Safeway own brand → ranked first on substitutes
  department: string; // "dairy eggs"
  aisle: string; // "Dairy Alternatives"
  size: string; // "64 fl oz"
  price: number; // USD, default list price
  diet_tags: DietTag[];
  allergens: Allergen[];
  upc?: string; // Kroger catalog only — needed by the Kroger Cart API
  image_url?: string; // Kroger catalog only
};

export type Store = {
  id: string; // "safeway-sf-01"
  name: string;
  neighborhood: string;
};

export type StoreStock = {
  store_id: string;
  product_id: string;
  in_stock: boolean;
  qty: number;
  aisle_number: string; // "12"
  price: number; // store price (may differ from list price)
};

export type ToolError = {
  error: { code: "not_found" | "invalid_input" | "upstream_failed"; message: string };
};

// --- search_catalog ---

export type SearchCatalogInput = {
  query: string;
  store_id?: string;
  substitute_for?: string;
  in_stock_only?: boolean;
  diet?: DietTag[];
  exclude_allergens?: Allergen[];
  max_price?: number;
  limit?: number;
};

export type SearchCatalogResult = {
  product: Product;
  score: number;
  stock?: StoreStock;
  price_diff?: number;
  reason?: string;
};

export type SearchCatalogOutput = {
  results: SearchCatalogResult[];
  took_ms: number;
  engine: "moss" | "local"; // extra field: which search backend answered
};

// --- check_stock ---

export type CheckStockInput = {
  store_id: string;
  product_ids: string[];
};

export type CheckStockOutput = {
  store_id: string;
  items: StoreStock[];
  unknown_ids: string[];
};
