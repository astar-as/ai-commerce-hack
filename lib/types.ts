export const DIET_TAGS = ["vegan", "vegetarian", "gluten_free", "dairy_free", "nut_free", "organic", "kosher"] as const;
export type DietTag = (typeof DIET_TAGS)[number];
export const ALLERGENS = ["milk", "eggs", "peanuts", "tree_nuts", "soy", "wheat", "fish", "shellfish", "sesame"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type Product = {
  id: string;
  name: string;
  brand: string;
  store_brand: boolean;
  department: string;
  aisle: string;
  size: string;
  price: number;
  diet_tags: DietTag[];
  allergens: Allergen[];
  image_url?: string;
  upc?: string; // Kroger catalog only — needed by the Kroger Cart API
};

export type Store = { id: string; name: string; neighborhood: string };

export type StoreStock = {
  store_id: string;
  product_id: string;
  in_stock: boolean;
  qty: number;
  aisle_number: string;
  price: number;
};

export type ToolError = { error: { code: "not_found" | "invalid_input" | "upstream_failed"; message: string } };

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

export type SearchResult = {
  product: Product;
  score: number;
  stock?: StoreStock;
  price_diff?: number;
  reason?: string;
};

export type SearchCatalogOutput = { results: SearchResult[]; took_ms: number; engine?: "moss" | "local" };

export type CheckStockInput = { store_id: string; product_ids: string[] };
export type CheckStockOutput = { store_id: string; items: StoreStock[]; unknown_ids: string[] };

export type HealthFilter = "ORGANIC" | "GLUTEN_FREE" | "FAT_FREE" | "VEGAN" | "KOSHER" | "SUGAR_FREE" | "LOW_FAT";

export type SendToInstacartInput = {
  title: string;
  items: Array<{
    product_id?: string;
    name: string;
    display_text?: string;
    quantity: number;
    unit?: string;
    brand?: string;
    health_filters?: HealthFilter[];
  }>;
};
export type SendToInstacartOutput = { url: string; item_count: number; mode: "instacart" | "mock" };

export type ReportOosInput = {
  store_id: string;
  product_id: string;
  outcome: "pending" | "substituted" | "skipped";
  substitute_product_id?: string;
  source: "shopper_tap" | "voice" | "agent";
};
export type ReportOosOutput = { event_id: string; recorded_at: string };

export type Dashboard = {
  revenue_retained: number;
  substitutions: number;
  skipped: number;
  top_oos: Array<{ product: Product; reports: number }>;
};

export type TranscriptLine = { role: "user" | "assistant"; text: string; at: number };

export type DelegateInput = {
  delegation_id: string;
  transcript: TranscriptLine[];
  store_id: string;
};

export type DelegateOutput = {
  say: string;
  thinking?: string;
  results?: SearchResult[];
  missing?: Product;
};
