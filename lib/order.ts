import { CATALOG, DEMO_STORE, KIND, OUT_OF_STOCK, productById } from "@/lib/demo-catalog";
import type { OrderAction, OrderItem, OrderState, Product, SearchResult } from "@/lib/types";

export const emptyOrder = (): OrderState => ({
  fulfillment: { mode: "instacart_delivery", store: DEMO_STORE, eta: "Today · 5–6 PM" },
  items: [],
  subtotal: 0,
});

const round = (n: number) => Math.round(n * 100) / 100;

const withSubtotal = (order: OrderState): OrderState => ({
  ...order,
  subtotal: round(order.items.reduce((sum, i) => sum + i.product.price * i.qty, 0)),
});

export function findSubstitutes(missing: Product, limit = 3): SearchResult[] {
  const hardTags = missing.diet_tags.filter((t) => t === "dairy_free" || t === "vegan" || t === "gluten_free");
  return CATALOG.filter(
    (p) =>
      p.id !== missing.id &&
      !OUT_OF_STOCK.has(p.id) &&
      KIND[p.id] !== undefined &&
      KIND[p.id] === KIND[missing.id] &&
      hardTags.every((t) => p.diet_tags.includes(t)),
  )
    .map((p) => {
      const price_diff = round(p.price - missing.price);
      const reasons = [
        p.store_brand ? "Store brand" : null,
        p.aisle === missing.aisle ? `Same aisle ${p.aisle}` : `Aisle ${p.aisle}`,
        ...hardTags.map((t) => t.replace("_", "-")),
      ].filter(Boolean);
      return {
        product: p,
        score: (p.store_brand ? 1 : 0) + 1 / (1 + Math.abs(price_diff)),
        price_diff,
        reason: reasons.join(" · "),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function applyAction(order: OrderState, action: OrderAction): OrderState {
  const items = [...order.items];
  const idx = (id: string) => items.findIndex((i) => i.product.id === id);

  switch (action.type) {
    case "add_item": {
      const product = productById(action.product_id);
      if (!product) return order;
      const i = idx(product.id);
      if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + (action.qty ?? 1) };
      else {
        const item: OrderItem = {
          product,
          qty: action.qty ?? 1,
          status: OUT_OF_STOCK.has(product.id) ? "out_of_stock" : "added",
        };
        items.push(item);
      }
      return withSubtotal({ ...order, items });
    }
    case "remove_item":
      return withSubtotal({ ...order, items: items.filter((i) => i.product.id !== action.product_id) });
    case "set_qty": {
      const i = idx(action.product_id);
      if (i < 0) return order;
      if (action.qty <= 0) return withSubtotal({ ...order, items: items.filter((_, j) => j !== i) });
      items[i] = { ...items[i], qty: action.qty };
      return withSubtotal({ ...order, items });
    }
    case "propose_swap": {
      const missing = productById(action.product_id);
      if (!missing) return order;
      const i = idx(missing.id);
      if (i >= 0) items[i] = { ...items[i], status: "out_of_stock" };
      return withSubtotal({
        ...order,
        items,
        pending: { kind: "swap", missing, options: findSubstitutes(missing) },
      });
    }
    case "swap_item": {
      const missing = productById(action.product_id);
      const sub = productById(action.substitute_product_id);
      if (!missing || !sub) return order;
      const i = idx(missing.id);
      const qty = i >= 0 ? items[i].qty : 1;
      const diff = round(sub.price - missing.price);
      const swapped: OrderItem = {
        product: sub,
        qty,
        status: "swapped",
        swapped_from: missing,
        note: [sub.store_brand ? "Store brand" : null, diff < 0 ? `−$${Math.abs(diff).toFixed(2)}` : diff > 0 ? `+$${diff.toFixed(2)}` : null]
          .filter(Boolean)
          .join(" · "),
      };
      if (i >= 0) items[i] = swapped;
      else items.push(swapped);
      return withSubtotal({ ...order, items, pending: undefined });
    }
    case "dismiss_swap":
      return { ...order, pending: undefined };
    case "set_fulfillment":
      return {
        ...order,
        fulfillment: {
          ...order.fulfillment,
          mode: action.mode,
          eta: action.mode === "instacart_delivery" ? "Today · 5–6 PM" : action.mode === "store_pickup" ? "Ready at 5:30 PM" : undefined,
        },
      };
  }
}

export const applyActions = (order: OrderState, actions: OrderAction[]) => actions.reduce(applyAction, order);
