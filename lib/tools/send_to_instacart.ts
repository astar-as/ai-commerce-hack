// send_to_instacart — turn our shopping list into an Instacart shopping-list link.
// Interface: PLAN.md → "3. send_to_instacart". Owner: person 4.
//
// Instacart matches products by *name* (our ids aren't Instacart ids), so `name`
// should be a search term ("oat milk") and `brand` / `health_filters` steer the match.
// The link can't pre-select Safeway: the shopper picks the store on Instacart.
//
// Falls back to our own mock cart page (mode: "mock") when there's no key,
// MOCK_TOOLS=1 is set, or Instacart errors — so the demo never breaks.
//
// Env (backend only):
//   INSTACART_API_KEY    dev key from the Instacart Developer Dashboard
//   INSTACART_BASE_URL   default https://connect.dev.instacart.tools
//   APP_URL              our app's public URL, default http://localhost:3000
//   MOCK_TOOLS=1         always return the mock cart

import { createHash } from "node:crypto";
import type { DietTag, HealthFilter, OrderState, SendToInstacartInput, SendToInstacartOutput, ToolError } from "../types";

export type MockCart = { title: string; items: SendToInstacartInput["items"] };

type Deps = {
  fetch: typeof fetch;
  env: Record<string, string | undefined>;
};

const DEFAULT_BASE_URL = "https://connect.dev.instacart.tools";
const DEFAULT_APP_URL = "http://localhost:3000";
const MOCK_CART_PATH = "/cart/mock";
const TIMEOUT_MS = 8000;
const MAX_ITEMS = 200;

const HEALTH_FILTERS = new Set<string>([
  "ORGANIC",
  "GLUTEN_FREE",
  "FAT_FREE",
  "VEGAN",
  "KOSHER",
  "SUGAR_FREE",
  "LOW_FAT",
]);

// Our unit → an Instacart-supported unit string. Anything unknown becomes "each".
// Instacart has no plain "fl oz"; "fl oz container" is the closest match.
const UNIT_MAP: Record<string, string> = {
  each: "each", ea: "each", ct: "each", count: "each", pc: "each", pcs: "each",
  "fl oz": "fl oz container", floz: "fl oz container",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  g: "g", gram: "g", grams: "g", kg: "kg", kilogram: "kg", kilograms: "kg",
  gal: "gallon", gallon: "gallon", gallons: "gallon",
  qt: "quart", quart: "quart", quarts: "quart",
  pt: "pint", pint: "pint", pints: "pint",
  l: "liter", liter: "liter", litre: "liter", liters: "liter",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  cup: "cup", cups: "cup",
  bunch: "bunch", bunches: "bunch",
  can: "can", cans: "can",
  head: "head", heads: "head",
  package: "package", packages: "package", pack: "package", pkg: "package",
  packet: "packet",
};

export function normalizeUnit(unit: string | undefined): string {
  if (!unit) return "each";
  return UNIT_MAP[unit.trim().toLowerCase()] ?? "each";
}

export function validateInput(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return "input must be an object";
  const { title, items } = input as Partial<SendToInstacartInput>;
  if (typeof title !== "string" || !title.trim()) return "title is required";
  if (!Array.isArray(items) || items.length === 0) return "items must be a non-empty array";
  if (items.length > MAX_ITEMS) return `items has more than ${MAX_ITEMS} entries`;
  for (const [i, item] of items.entries()) {
    if (typeof item !== "object" || item === null) return `items[${i}] must be an object`;
    if (typeof item.name !== "string" || !item.name.trim()) return `items[${i}].name is required`;
    if (typeof item.quantity !== "number" || !(item.quantity > 0))
      return `items[${i}].quantity must be a number > 0`;
    for (const f of item.health_filters ?? [])
      if (!HEALTH_FILTERS.has(f)) return `items[${i}].health_filters has unknown value "${f}"`;
  }
  return null;
}

// Request body for POST /idp/v1/products/products_link.
export function buildInstacartRequest(input: SendToInstacartInput, appUrl: string) {
  return {
    title: input.title,
    link_type: "shopping_list",
    line_items: input.items.map((item) => {
      const filters: { brand_filters?: string[]; health_filters?: string[] } = {};
      if (item.brand) filters.brand_filters = [item.brand]; // case-sensitive on Instacart
      if (item.health_filters?.length) filters.health_filters = item.health_filters;
      return {
        name: item.name,
        ...(item.display_text ? { display_text: item.display_text } : {}),
        line_item_measurements: [{ quantity: item.quantity, unit: normalizeUnit(item.unit) }],
        ...(Object.keys(filters).length ? { filters } : {}),
      };
    }),
    landing_page_configuration: { partner_linkback_url: appUrl },
  };
}

// The mock cart page reads the whole list from the URL, so it needs no storage.
export function mockCartUrl(input: SendToInstacartInput, appUrl: string): string {
  const cart: MockCart = { title: input.title, items: input.items };
  const encoded = Buffer.from(JSON.stringify(cart)).toString("base64url");
  return `${appUrl.replace(/\/$/, "")}${MOCK_CART_PATH}?list=${encoded}`;
}

// For the frontend's /cart/mock page: decode the `list` query param.
export function decodeMockCart(list: string): MockCart | null {
  try {
    return JSON.parse(Buffer.from(list, "base64url").toString("utf8")) as MockCart;
  } catch {
    return null;
  }
}

// Instacart asks partners to reuse links and only regenerate when the list changes.
const linkCache = new Map<string, string>();

export function clearLinkCache() {
  linkCache.clear();
}

function listHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export async function sendToInstacart(
  input: SendToInstacartInput,
  deps: Deps = { fetch: globalThis.fetch, env: process.env },
): Promise<SendToInstacartOutput | ToolError> {
  const invalid = validateInput(input);
  if (invalid) return { error: { code: "invalid_input", message: invalid } };

  const { env } = deps;
  const appUrl = env.APP_URL || DEFAULT_APP_URL;
  const item_count = input.items.length;
  const mock = (fallback_reason: string): SendToInstacartOutput => ({
    url: mockCartUrl(input, appUrl),
    item_count,
    mode: "mock",
    fallback_reason,
  });

  if (env.MOCK_TOOLS === "1") return mock("MOCK_TOOLS=1");
  const apiKey = env.INSTACART_API_KEY;
  if (!apiKey) return mock("INSTACART_API_KEY not set");

  const body = buildInstacartRequest(input, appUrl);
  const key = listHash(body);
  const cached = linkCache.get(key);
  if (cached) return { url: cached, item_count, mode: "instacart" };

  const baseUrl = (env.INSTACART_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  try {
    const res = await deps.fetch(`${baseUrl}/idp/v1/products/products_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(`[send_to_instacart] Instacart ${res.status}: ${text.slice(0, 500)}`);
      return mock(`Instacart returned ${res.status}`);
    }
    const url = (JSON.parse(text) as { products_link_url?: unknown }).products_link_url;
    if (typeof url !== "string" || !url) return mock("Instacart response had no products_link_url");
    linkCache.set(key, url);
    return { url, item_count, mode: "instacart" };
  } catch (err) {
    console.warn("[send_to_instacart] Instacart call failed:", err);
    return mock(`Instacart call failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const DIET_TO_HEALTH: Partial<Record<DietTag, HealthFilter>> = {
  organic: "ORGANIC",
  vegan: "VEGAN",
  gluten_free: "GLUTEN_FREE",
  kosher: "KOSHER",
};

// The live order → a send_to_instacart list. Out-of-stock items are left out.
export function orderToInstacartList(order: OrderState): SendToInstacartInput {
  return {
    title: `Basket — ${order.fulfillment.store.name}`,
    items: order.items
      .filter((item) => item.status !== "out_of_stock")
      .map(({ product, qty }) => {
        const health_filters = product.diet_tags.flatMap((tag) => DIET_TO_HEALTH[tag] ?? []);
        return {
          product_id: product.id,
          name: product.name,
          display_text: product.size ? `${product.name}, ${product.size}` : product.name,
          quantity: qty,
          unit: "each",
          ...(product.brand ? { brand: product.brand } : {}),
          ...(health_filters.length ? { health_filters } : {}),
        };
      }),
  };
}

// For Instacart delivery, (re)build checkout_url from the current order so the checkout
// button always opens the latest list. appUrl is used for the mock cart when APP_URL isn't set.
export async function withCheckoutUrl(order: OrderState, appUrl: string): Promise<OrderState> {
  if (order.fulfillment.mode !== "instacart_delivery") return order;
  const list = orderToInstacartList(order);
  if (list.items.length === 0) return { ...order, fulfillment: { ...order.fulfillment, checkout_url: undefined } };
  const result = await sendToInstacart(list, {
    fetch: globalThis.fetch,
    env: { ...process.env, APP_URL: process.env.APP_URL || appUrl },
  });
  if ("error" in result) return order;
  return { ...order, fulfillment: { ...order.fulfillment, checkout_url: result.url } };
}

// Same shape as the other tools in lib/tools/index.ts (data-search branch): register it there
// as [sendToInstacartTool.name]: sendToInstacartTool. Don't add a MOCKS entry — the tool
// already returns the mock cart itself when MOCK_TOOLS=1.
export const sendToInstacartTool = {
  name: "send_to_instacart",
  description:
    "Send the shopping list to Instacart for online checkout. Returns a link to a pre-filled Instacart " +
    "shopping list where the shopper picks their store (e.g. Safeway) and checks out. Use a generic search " +
    'term as each item\'s name ("oat milk") and put the brand in brand. If mode is "mock", the link is our own ' +
    "cart preview instead of Instacart.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: 'List title, e.g. "Week of Oct 5 — family of 3".' },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            product_id: { type: "string", description: "Our catalog id, for logging only." },
            name: { type: "string", description: 'Search term Instacart matches on, e.g. "oat milk".' },
            display_text: { type: "string", description: 'Shown to the shopper, e.g. "O Organics Oat Milk, 64 fl oz".' },
            quantity: { type: "number", exclusiveMinimum: 0 },
            unit: { type: "string", description: 'each, oz, lb, gallon, can, package… Default "each".' },
            brand: { type: "string", description: 'Exact brand, e.g. "O Organics".' },
            health_filters: {
              type: "array",
              items: { type: "string", enum: [...HEALTH_FILTERS] },
            },
          },
          required: ["name", "quantity"],
        },
      },
    },
    required: ["title", "items"],
  },
  run: (input: SendToInstacartInput) => sendToInstacart(input),
};

// HTTP handler for POST /api/tools/send_to_instacart (app/api/tools/send_to_instacart/route.ts).
export async function handleSendToInstacart(req: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    const error: ToolError = { error: { code: "invalid_input", message: "body must be JSON" } };
    return Response.json(error, { status: 400 });
  }
  const result = await sendToInstacart(input as SendToInstacartInput, {
    fetch: globalThis.fetch,
    env: { ...process.env, APP_URL: process.env.APP_URL || new URL(req.url).origin },
  });
  return Response.json(result, { status: "error" in result ? 400 : 200 });
}
