// checkout: place the order the screen shows, the way the shopper chose to get it.
import { profileViolations } from "@/lib/profile/guard";
import { issueReceipt, maskEmail } from "@/lib/receipts/issue";
import { createPickupOrder } from "./create_pickup_order";
import { orderSummary } from "./order_tools";
import { withCheckoutUrl } from "@/lib/tools/send_to_instacart";
import { AgentToolError, type ToolContext, type ToolDefinition } from "./types";

async function checkout(_input: { title?: string }, ctx: ToolContext) {
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
      const eta = `Pickup ${pickup.slot} · code ${pickup.pickup_code}`;
      ctx.order = { ...order, fulfillment: { ...order.fulfillment, eta } };
      // Paid: issue the receipt and email it to the household automatically.
      const { receipt, email } = await issueReceipt({
        channel: "store_pickup",
        lines: order.items.map((i) => ({ product: i.product, qty: i.qty })),
        profile: ctx.profile,
        pickup: eta,
      });
      return {
        placed: "store_pickup", pickup_code: pickup.pickup_code, slot: pickup.slot, store: pickup.store_name, total: pickup.total,
        receipt: { id: receipt.id, emailed_to: email ? maskEmail(email.to) : null },
        order: orderSummary(ctx.order),
      };
    }
    case "instacart_delivery": {
      // Same Instacart path /api/delegate uses (owner 4): real link with a key, mock cart page otherwise.
      ctx.order = await withCheckoutUrl(order, process.env.APP_URL ?? "https://ai-commerce-hack.vercel.app");
      // The receipt is sent when the shopper pays on the checkout page, not here.
      return { placed: "instacart_delivery", link_ready: Boolean(ctx.order.fulfillment.checkout_url), receipt: "emailed automatically once they pay", order: orderSummary(ctx.order) };
    }
    case "in_store":
      throw new AgentToolError("invalid_input", "the shopper is shopping in the store; there's nothing to place");
  }
}

export const checkoutTool: ToolDefinition<{ title?: string }> = {
  name: "checkout",
  description:
    "Place the current order using its fulfillment mode. store_pickup: creates the pickup order, returns " +
    "the slot and a 4-digit pickup code, and emails the receipt to the household automatically. instacart_delivery: creates the pre-filled Instacart list; the " +
    "checkout button on screen opens it, and the shopper picks a delivery time and pays there. " +
    "Only call it after the shopper clearly said yes to placing the order. Never read the link aloud.",
  input_schema: { type: "object", properties: { title: { type: "string", description: 'e.g. "Pasta night for 4"' } } },
  run: checkout,
};
