import OpenAI from "openai";
import { CATALOG, OUT_OF_STOCK } from "@/lib/catalog";
import { applyActions, findSubstitutes } from "@/lib/order";
import type { DelegateInput, DelegateOutput, FulfillmentMode, OrderAction } from "@/lib/types";

const MODEL = process.env.OPENAI_AGENT_MODEL ?? "gpt-6-luna";

const catalogLines = () =>
  CATALOG.map(
    (p) =>
      `${p.id} | ${p.name} | ${p.brand}${p.store_brand ? " (store brand)" : ""} | ${p.size} | $${p.price.toFixed(2)} | aisle ${p.aisle} | ${p.department} | ${p.diet_tags.join(",") || "-"}${OUT_OF_STOCK.has(p.id) ? " | OUT OF STOCK" : ""}`,
  ).join("\n");

const substituteLines = () =>
  CATALOG.filter((p) => OUT_OF_STOCK.has(p.id))
    .map(
      (p) =>
        `${p.id} ${p.name} → ${findSubstitutes(p)
          .map((s) => `${s.product.id} ${s.product.name} $${s.product.price.toFixed(2)} (${s.price_diff! < 0 ? "−" : "+"}$${Math.abs(s.price_diff!).toFixed(2)})`)
          .join("; ")}`,
    )
    .join("\n");

const INSTRUCTIONS =`You are Basket, the grocery agent of a Safeway-style demo store. You run behind a live voice assistant: the shopper talks, you decide what changes in their order, and you return one short sentence the voice will say.

Rules:
- Only use product ids from the catalog. If the shopper wants something that isn't in the catalog, say this demo store doesn't carry it.
- Adding an item that is OUT OF STOCK, or the shopper saying an item is missing/empty/out: emit propose_swap for that item and, in "say", offer the best option (store brand first, then closest price) with the price difference, and ask to confirm.
- Never emit swap_item unless the shopper has just confirmed a pending swap. "Yes", "sure", "do it" picks the first option; naming a product picks that option. A no emits dismiss_swap.
- Delivery / Instacart → set_fulfillment instacart_delivery. Pickup → store_pickup. "I'm in the store" / shopping now → in_store.
- If the shopper mentions allergies, never promise an item is safe; tell them to check the label.
- "say" is spoken aloud: one or two short, warm sentences, no lists, no markdown, no ids.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["say", "actions"],
  properties: {
    say: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "product_id", "substitute_product_id", "qty", "mode"],
        properties: {
          type: {
            type: "string",
            enum: ["add_item", "remove_item", "set_qty", "propose_swap", "swap_item", "dismiss_swap", "set_fulfillment"],
          },
          product_id: { type: ["string", "null"] },
          substitute_product_id: { type: ["string", "null"] },
          qty: { type: ["integer", "null"] },
          mode: { type: ["string", "null"], enum: ["instacart_delivery", "store_pickup", "in_store", null] },
        },
      },
    },
  },
} as const;

type RawAction = {
  type: OrderAction["type"];
  product_id: string | null;
  substitute_product_id: string | null;
  qty: number | null;
  mode: FulfillmentMode | null;
};

function toAction(a: RawAction): OrderAction | null {
  switch (a.type) {
    case "add_item":
      return a.product_id ? { type: "add_item", product_id: a.product_id, qty: a.qty ?? 1 } : null;
    case "remove_item":
      return a.product_id ? { type: "remove_item", product_id: a.product_id } : null;
    case "set_qty":
      return a.product_id && a.qty != null ? { type: "set_qty", product_id: a.product_id, qty: a.qty } : null;
    case "propose_swap":
      return a.product_id ? { type: "propose_swap", product_id: a.product_id } : null;
    case "swap_item":
      return a.product_id && a.substitute_product_id
        ? { type: "swap_item", product_id: a.product_id, substitute_product_id: a.substitute_product_id }
        : null;
    case "dismiss_swap":
      return { type: "dismiss_swap" };
    case "set_fulfillment":
      return a.mode ? { type: "set_fulfillment", mode: a.mode } : null;
  }
}

export async function runAgentTurn(input: DelegateInput): Promise<DelegateOutput> {
  const client = new OpenAI();
  const { order, transcript } = input;

  const orderLines = order.items.length
    ? order.items.map((i) => `${i.product.id} ${i.product.name} ×${i.qty} [${i.status}]`).join("\n")
    : "(empty)";
  const pending = order.pending
    ? `Pending swap for ${order.pending.missing.id} ${order.pending.missing.name}. Options in order: ${order.pending.options
        .map((o) => `${o.product.id} ${o.product.name} $${o.product.price.toFixed(2)}`)
        .join("; ")}`
    : "No pending swap.";
  const convo = transcript
    .slice(-12)
    .map((l) => `${l.role === "user" ? "Shopper" : "Voice"}: ${l.text}`)
    .join("\n");

  const response = await client.responses.create({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: `CATALOG\n${catalogLines()}\n\nRANKED SUBSTITUTES FOR OUT-OF-STOCK ITEMS (offer the first one)\n${substituteLines()}\n\nORDER (fulfillment: ${order.fulfillment.mode})\n${orderLines}\n\n${pending}\n\nCONVERSATION\n${convo}`,
    text: { format: { type: "json_schema", name: "basket_turn", strict: true, schema: SCHEMA } },
  });

  const parsed = JSON.parse(response.output_text) as { say: string; actions: RawAction[] };
  const actions = parsed.actions.map(toAction).filter((a): a is OrderAction => a !== null);
  return { say: parsed.say, actions, order: applyActions(order, actions) };
}
