import stores from "@/data/kroger/stores.json";
import type { FulfillmentMode, OrderItem, OrderState, Product } from "@/lib/types";

export const STORE = { id: stores[0].id, name: stores[0].name };

export const round = (n: number) => Math.round(n * 100) / 100;

export const emptyOrder = (): OrderState => ({
  fulfillment: { mode: "instacart_delivery", store: STORE, eta: "Today · 5–6 PM" },
  items: [],
  subtotal: 0,
});

export const withSubtotal = (order: OrderState): OrderState => ({
  ...order,
  subtotal: round(order.items.reduce((sum, i) => sum + i.product.price * i.qty, 0)),
});

export function swapInOrder(order: OrderState, missing: Product, sub: Product): OrderState {
  const items = [...order.items];
  const i = items.findIndex((it) => it.product.id === missing.id);
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

export function setFulfillment(order: OrderState, mode: FulfillmentMode): OrderState {
  return {
    ...order,
    fulfillment: {
      ...order.fulfillment,
      mode,
      eta: mode === "instacart_delivery" ? "Today · 5–6 PM" : mode === "store_pickup" ? "Ready at 5:30 PM" : undefined,
    },
  };
}
