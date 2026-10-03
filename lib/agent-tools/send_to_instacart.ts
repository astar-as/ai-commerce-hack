// Home delivery: turn the order into a pre-filled Instacart shopping list (POST /idp/v1/products/products_link).
// The shopper opens the link, picks Safeway, a delivery window and pays on Instacart.
import { createHash } from "node:crypto";
import { newId, state } from "@/lib/store/memory";
import type { OrderState, SendToInstacartInput, SendToInstacartOutput } from "@/lib/types";

const BASE_URL = process.env.INSTACART_BASE_URL ?? "https://connect.dev.instacart.tools";
const APP_URL = process.env.APP_URL ?? "https://ai-commerce-hack.vercel.app";
// Without a key (or if Instacart fails) the shopper still lands somewhere real.
const FALLBACK_URL = "https://www.instacart.com/store/safeway/storefront";

// Instacart asks partners to reuse a link until the list changes.
const linkCache = new Map<string, string>();

export function instacartInput(order: OrderState, title: string): SendToInstacartInput {
  return {
    title,
    items: order.items.map((i) => ({
      product_id: i.product.id,
      name: i.product.name,
      display_text: `${i.product.name}, ${i.product.size}`,
      quantity: i.qty,
      unit: "each",
      brand: i.product.brand,
    })),
  };
}

async function createInstacartLink(input: SendToInstacartInput, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/idp/v1/products/products_link`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      title: input.title,
      link_type: "shopping_list",
      line_items: input.items.map((item) => ({
        name: item.name,
        display_text: item.display_text,
        line_item_measurements: [{ quantity: item.quantity, unit: item.unit ?? "each" }],
        filters: {
          ...(item.brand && { brand_filters: [item.brand] }),
          ...(item.health_filters?.length && { health_filters: item.health_filters }),
        },
      })),
      landing_page_configuration: { partner_linkback_url: APP_URL },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Instacart ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { products_link_url?: string };
  if (!body.products_link_url) throw new Error("Instacart response had no products_link_url");
  return body.products_link_url;
}

export async function sendToInstacart(input: SendToInstacartInput): Promise<SendToInstacartOutput> {
  const key = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  let url = linkCache.get(key);
  let mode: SendToInstacartOutput["mode"] = "instacart";

  if (!url) {
    try {
      const apiKey = process.env.INSTACART_API_KEY;
      if (!apiKey) throw new Error("no INSTACART_API_KEY");
      url = await createInstacartLink(input, apiKey);
      linkCache.set(key, url);
    } catch (err) {
      // The demo must not die on Instacart.
      console.warn("[send_to_instacart] using fallback link:", (err as Error).message);
      mode = "mock";
      url = FALLBACK_URL;
    }
  }

  state.orders.unshift({
    order_id: newId("dl"),
    kind: "delivery",
    title: input.title,
    url,
    mode,
    item_count: input.items.length,
    created_at: new Date().toISOString(),
  });
  return { url, item_count: input.items.length, mode };
}
