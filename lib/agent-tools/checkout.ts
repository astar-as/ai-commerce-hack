// checkout: place the order the screen shows, the way the shopper chose to get it.
import { profileViolations } from "@/lib/profile/guard";
import { createPickupOrder } from "./create_pickup_order";
import { orderSummary } from "./order_tools";
import { instacartInput, sendToInstacart } from "./send_to_instacart";
import { AgentToolError, type ToolContext, type ToolDefinition } from "./types";

async function checkout(input: { title?: string }, ctx: ToolContext) {
  const order = ctx.order;
  if (!order.items.length) throw new AgentToolError("invalid_input", "the order is empty");
  if (order.pending) throw new AgentToolError("invalid_input", "a swap is still pending; resolve it first");
  for (const item of order.items) {
    const why = profileViolations(item.product, ctx.profile);
    if (why.length) throw new AgentToolError("invalid_input", `${item.product.name} is blocked by the household profile (${why.join(", ")}). Remove it first.`);
  }

  switch (order.fulfillment.mode) {
    case "store_pickup": {
      const pickup = createPickupOrder(order, ctx.profile?.name ?? "Guest");
      ctx.order = { ...order, fulfillment: { ...order.fulfillment, eta: `Pickup ${pickup.slot} · code ${pickup.pickup_code}` } };
      return { placed: "store_pickup", pickup_code: pickup.pickup_code, slot: pickup.slot, store: pickup.store_name, total: pickup.total, order: orderSummary(ctx.order) };
    }
    case "instacart_delivery": {
      const out = await sendToInstacart(instacartInput(order, input.title || "Basket order"));
      ctx.order = { ...order, fulfillment: { ...order.fulfillment, checkout_url: out.url } };
      return { placed: "instacart_delivery", link_ready: true, mode: out.mode, item_count: out.item_count, order: orderSummary(ctx.order) };
    }
    case "in_store":
      throw new AgentToolError("invalid_input", "the shopper is shopping in the store; there's nothing to place");
  }
}

export const checkoutTool: ToolDefinition<{ title?: string }> = {
  name: "checkout",
  description:
    "Place the current order using its fulfillment mode. store_pickup: creates the pickup order and returns " +
    "the slot and a 4-digit pickup code. instacart_delivery: creates the pre-filled Instacart list; the " +
    "checkout button on screen opens it, and the shopper picks Safeway, a delivery time and pays there. " +
    "Only call it after the shopper clearly said yes to placing the order. Never read the link aloud.",
  input_schema: { type: "object", properties: { title: { type: "string", description: 'e.g. "Pasta night for 4"' } } },
  run: checkout,
};
