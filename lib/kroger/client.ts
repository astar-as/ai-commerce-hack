// Minimal Kroger Public API client (developer.kroger.com).
// App credentials (client_credentials) → Locations + Products. Adding to a shopper's cart needs a
// *user* token (authorization_code flow, scope cart.basic:write) — see addToCart below.

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
  });
  if (!res.ok) throw new Error(`Kroger token ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return appToken.value;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${await getAppToken()}`, Accept: "application/json" },
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

// Person 4 (integrations): call with the shopper's OAuth access token from the authorization_code flow.
export async function addToCart(
  userToken: string,
  items: Array<{ upc: string; quantity: number; modality?: "PICKUP" | "DELIVERY" }>,
): Promise<void> {
  const res = await fetch(`${BASE}/cart/add`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`Kroger cart/add ${res.status}: ${await res.text()}`);
}
