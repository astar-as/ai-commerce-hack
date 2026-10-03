// Order tools: one per OrderAction in lib/types.ts, applied with applyAction from lib/order.ts.
// The tools change ctx.order (what the screen renders) and record each action for /api/delegate.
import { DEMO_STORE, OUT_OF_STOCK, productById } from "@/lib/demo-catalog";
import { applyAction } from "@/lib/order";
import { profileViolations } from "@/lib/profile/guard";
import type { FulfillmentMode, OrderAction, OrderState } from "@/lib/types";
import { reportOos } from "./report_oos";
import { AgentToolError, type ToolContext, type ToolDefinition } from "./types";

// What the agent sees back after every order change: small, enough to talk about.
export function orderSummary(order: OrderState) {
  return {
    items: order.items.map((i) => ({ id: i.product.id, name: i.product.name, qty: i.qty, status: i.status, price: i.product.price })),
    subtotal: order.subtotal,
    fulfillment: { mode: order.fulfillment.mode, store: order.fulfillment.store.name, eta: order.fulfillment.eta, checkout_url: order.fulfillment.checkout_url },
    ...(order.pending && {
      pending_swap: {
        missing: { id: order.pending.missing.id, name: order.pending.missing.name },
        options: order.pending.options.map((o) => ({ id: o.product.id, name: o.product.name, price: o.product.price, price_diff: o.price_diff })),
      },
    }),
  };
}

function requireProduct(id: string) {
  const product = productById(id);
  if (!product) throw new AgentToolError("not_found", `unknown product ${id}; use an id from search_catalog`);
  return product;
}

function guard(id: string, ctx: ToolContext) {
  const product = requireProduct(id);
  const why = profileViolations(product, ctx.profile);
  if (why.length) throw new AgentToolError("invalid_input", `${product.name} is blocked by the household profile (${why.join(", ")}). Pick a safe alternative.`);
  return product;
}

function apply(ctx: ToolContext, action: OrderAction) {
  ctx.order = applyAction(ctx.order, action);
  ctx.actions.push(action);
  return orderSummary(ctx.order);
}

const oos = (product_id: string, outcome: "pending" | "substituted" | "skipped", substitute_product_id?: string) =>
  reportOos({ store_id: DEMO_STORE.id, product_id, outcome, substitute_product_id, source: "voice" }).catch(() => undefined);

const productId = { type: "string", description: "Id from search_catalog." };

export const addItemTool: ToolDefinition<{ product_id: string; qty?: number }> = {
  name: "add_item",
  description:
    "Add a product to the order (or add to its quantity). If it comes back with status out_of_stock, " +
    "call propose_swap for it and offer the first option.",
  input_schema: { type: "object", properties: { product_id: productId, qty: { type: "integer", minimum: 1 } }, required: ["product_id"] },
  run: async ({ product_id, qty }, ctx) => {
    guard(product_id, ctx);
    return apply(ctx, { type: "add_item", product_id, qty: qty ?? 1 });
  },
};

export const removeItemTool: ToolDefinition<{ product_id: string }> = {
  name: "remove_item",
  description: "Remove a product from the order.",
  input_schema: { type: "object", properties: { product_id: productId }, required: ["product_id"] },
  run: async ({ product_id }, ctx) => apply(ctx, { type: "remove_item", product_id }),
};

export const setQtyTool: ToolDefinition<{ product_id: string; qty: number }> = {
  name: "set_qty",
  description: "Set the quantity of a product already in the order. 0 removes it.",
  input_schema: { type: "object", properties: { product_id: productId, qty: { type: "integer", minimum: 0 } }, required: ["product_id", "qty"] },
  run: async ({ product_id, qty }, ctx) => apply(ctx, { type: "set_qty", product_id, qty }),
};

export const proposeSwapTool: ToolDefinition<{ product_id: string }> = {
  name: "propose_swap",
  description:
    "An item is out of stock or the shopper says it's missing from the shelf: show the swap card with the best " +
    "substitutes (store brand first). Then offer the first option with its price difference and wait for a yes.",
  input_schema: { type: "object", properties: { product_id: { type: "string", description: "The missing product." } }, required: ["product_id"] },
  run: async ({ product_id }, ctx) => {
    requireProduct(product_id);
    const summary = apply(ctx, { type: "propose_swap", product_id });
    // The card's options must respect the profile too.
    if (ctx.order.pending && ctx.profile) {
      const options = ctx.order.pending.options.filter((o) => profileViolations(o.product, ctx.profile).length === 0);
      ctx.order = { ...ctx.order, pending: { ...ctx.order.pending, options } };
    }
    void oos(product_id, "pending");
    return { ...summary, ...orderSummary(ctx.order) };
  },
};

export const swapItemTool: ToolDefinition<{ product_id: string; substitute_product_id: string }> = {
  name: "swap_item",
  description:
    "Replace a missing product with a substitute. Only after the shopper has just said yes to it " +
    '("yes" means the first option; naming one picks that one).',
  input_schema: {
    type: "object",
    properties: { product_id: { type: "string", description: "The missing product." }, substitute_product_id: productId },
    required: ["product_id", "substitute_product_id"],
  },
  run: async ({ product_id, substitute_product_id }, ctx) => {
    requireProduct(product_id);
    const sub = guard(substitute_product_id, ctx);
    if (OUT_OF_STOCK.has(sub.id)) throw new AgentToolError("invalid_input", `${sub.name} is out of stock too`);
    void oos(product_id, "substituted", substitute_product_id);
    return apply(ctx, { type: "swap_item", product_id, substitute_product_id });
  },
};

export const dismissSwapTool: ToolDefinition<Record<string, never>> = {
  name: "dismiss_swap",
  description: "The shopper declined the substitute: close the swap card and leave the item out.",
  input_schema: { type: "object", properties: {} },
  run: async (_input, ctx) => {
    if (ctx.order.pending) void oos(ctx.order.pending.missing.id, "skipped");
    return apply(ctx, { type: "dismiss_swap" });
  },
};

const MODES: FulfillmentMode[] = ["instacart_delivery", "store_pickup", "in_store"];

export const setFulfillmentTool: ToolDefinition<{ mode: FulfillmentMode }> = {
  name: "set_fulfillment",
  description:
    "Set how the shopper gets the order: instacart_delivery (home delivery), store_pickup, or in_store " +
    "(they're shopping in the store now).",
  input_schema: { type: "object", properties: { mode: { type: "string", enum: MODES } }, required: ["mode"] },
  run: async ({ mode }, ctx) => {
    if (!MODES.includes(mode)) throw new AgentToolError("invalid_input", `mode must be one of ${MODES.join(", ")}`);
    return apply(ctx, { type: "set_fulfillment", mode });
  },
};

export const ORDER_TOOLS = [addItemTool, removeItemTool, setQtyTool, proposeSwapTool, swapItemTool, dismissSwapTool, setFulfillmentTool];
