// Minimal Kroger Public API client (developer.kroger.com).
// App credentials only (client_credentials) → Locations + Products. No shopper login: Kroger is our
// in-store data source; online ordering goes through Instacart.

const BASE = process.env.KROGER_API_BASE ?? "https://api.kroger.com/v1";

export type KrogerLocation = {
  locationId: string;
  chain: string;
  name: string;
  address: { addressLine1: string; city: string; state: string; zipCode: string };
};

export type KrogerProduct = {
  productId: string;
  upc: string;
  brand?: string;
  description: string;
  categories?: string[];
  allergens?: Array<{ name: string; levelOfContainmentName: string }>;
  manufacturerDeclarations?: string[];
  aisleLocations?: Array<{ description?: string; number?: string; side?: string; shelfNumber?: string }>;
  images?: Array<{ perspective: string; featured?: boolean; sizes: Array<{ size: string; url: string }> }>;
  items?: Array<{
    itemId: string;
    size?: string;
    price?: { regular: number; promo: number };
    inventory?: { stockLevel: "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK" };
    fulfillment?: { curbside?: boolean; delivery?: boolean; inStore?: boolean; shipToHome?: boolean };
  }>;
};

let appToken: { value: string; expiresAt: number } | undefined;

async function getAppToken(): Promise<string> {
  if (appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.value;
  const id = process.env.KROGER_CLIENT_ID;
  const secret = process.env.KROGER_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET (see .env.example)");
  const res = await fetch(`${BASE}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "product.compact" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Kroger token ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return appToken.value;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${await getAppToken()}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000), // a hung request must not stall the whole import
  });
  if (!res.ok) throw new Error(`Kroger GET ${path} ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { data: T }).data;
}

export function findLocations(zipCode: string, limit = 5): Promise<KrogerLocation[]> {
  return get("/locations", { "filter.zipCode.near": zipCode, "filter.limit": String(limit) });
}

export function searchProducts(term: string, locationId: string, limit = 10): Promise<KrogerProduct[]> {
  return get("/products", { "filter.term": term, "filter.locationId": locationId, "filter.limit": String(limit) });
}
