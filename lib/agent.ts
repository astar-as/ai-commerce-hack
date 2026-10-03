import OpenAI from "openai";
import { CATALOG, OUT_OF_STOCK } from "@/lib/demo-catalog";
import { applyActions, findSubstitutes } from "@/lib/order";
import { searchOrderHistoryTool } from "@/lib/tools/search_order_history";
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
- When the shopper refers to something they bought before ("that bread from two weeks ago", "my usual", "same as last time"), call search_order_history first, then add the matching product by its id and mention when they bought it, e.g. "the Acme Pain au Levain you got two weeks ago". If several match, pick the closest in time or ask.
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

async function runHistoryTool(name: string, args: string, hits: Map<string, number>) {
  if (name !== searchOrderHistoryTool.name) return { error: { code: "not_found", message: `Unknown tool ${name}` } };
  const out = await searchOrderHistoryTool.run(JSON.parse(args || "{}"));
  for (const m of out.matches) hits.set(m.product.id, m.receipt.days_ago);
  return {
    matches: out.matches.map((m) => ({
      product_id: m.product.id,
      name: m.product.name,
      brand: m.product.brand,
      size: m.product.size,
      price_now: m.product.price,
      bought_on: m.receipt.date,
      days_ago: m.receipt.days_ago,
      times_bought: m.times_bought,
      out_of_stock_now: OUT_OF_STOCK.has(m.product.id),
    })),
    recent_receipts: out.recent_receipts,
  };
}

const ago = (days: number) =>
  days <= 1 ? "yesterday" : days < 7 ? `${days} days ago` : days < 11 ? "last week" : days < 25 ? `${Math.round(days / 7)} weeks ago` : `${days} days ago`;

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

  const tools = [
    {
      type: "function" as const,
      name: searchOrderHistoryTool.name,
      description: searchOrderHistoryTool.description,
      parameters: searchOrderHistoryTool.input_schema,
      strict: false,
    },
  ];
  const format = { type: "json_schema" as const, name: "basket_turn", strict: true, schema: SCHEMA };

  let response = await client.responses.create({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: `CATALOG\n${catalogLines()}\n\nRANKED SUBSTITUTES FOR OUT-OF-STOCK ITEMS (offer the first one)\n${substituteLines()}\n\nORDER (fulfillment: ${order.fulfillment.mode})\n${orderLines}\n\n${pending}\n\nCONVERSATION\n${convo}`,
    tools,
    text: { format },
  });

  const historyHits = new Map<string, number>();
  for (let round = 0; round < 3; round++) {
    const calls = response.output.filter((o) => o.type === "function_call");
    if (!calls.length) break;
    const outputs = await Promise.all(
      calls.map(async (c) => ({
        type: "function_call_output" as const,
        call_id: c.call_id,
        output: JSON.stringify(await runHistoryTool(c.name, c.arguments, historyHits)),
      })),
    );
    response = await client.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      previous_response_id: response.id,
      input: outputs,
      tools,
      text: { format },
    });
  }

  const parsed = JSON.parse(response.output_text) as { say: string; actions: RawAction[] };
  const actions = parsed.actions.map(toAction).filter((a): a is OrderAction => a !== null);
  const next = applyActions(order, actions);
  const added = new Set(actions.flatMap((a) => (a.type === "add_item" ? [a.product_id] : [])));
  const items = next.items.map((i) =>
    added.has(i.product.id) && historyHits.has(i.product.id) && !i.note
      ? { ...i, note: `Bought ${ago(historyHits.get(i.product.id)!)}` }
      : i,
  );
  return { say: parsed.say, actions, order: { ...next, items } };
}
