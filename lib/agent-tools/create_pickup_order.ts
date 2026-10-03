// Store pickup: records the order the store starts picking (visible in GET /api/orders).
import { DEMO_STORE, OUT_OF_STOCK } from "@/lib/demo-catalog";
import { newId, state, type OrderLine, type PickupOrder } from "@/lib/store/memory";
import type { OrderState } from "@/lib/types";
import { AgentToolError } from "./types";

// Next 30-minute slot at least an hour from now, Pacific time.
export function nextPickupSlot(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const minutes = Number(parts.find((p) => p.type === "hour")?.value ?? 12) * 60 + Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  let slot = Math.ceil((minutes + 60) / 30) * 30;
  let day = "Today";
  if (slot > 21 * 60) {
    slot = 9 * 60;
    day = "Tomorrow";
  }
  const h = Math.floor(slot / 60);
  return `${day} ${((h + 11) % 12) + 1}:${String(slot % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function createPickupOrder(order: OrderState, customerName: string): PickupOrder {
  const missing = order.items.filter((i) => i.status === "out_of_stock" || OUT_OF_STOCK.has(i.product.id));
  if (missing.length) {
    throw new AgentToolError("invalid_input", `out of stock: ${missing.map((i) => i.product.name).join(", ")}. Swap or remove them first.`);
  }
  const lines: OrderLine[] = order.items.map((i) => ({ product_id: i.product.id, name: i.product.name, quantity: i.qty, unit_price: i.product.price, in_stock: true }));
  const pickup: PickupOrder = {
    order_id: newId("pu"),
    kind: "pickup",
    store_id: DEMO_STORE.id,
    store_name: DEMO_STORE.name,
    // Keep the slot already shown to the shopper (set by set_fulfillment) if there is one.
    slot: order.fulfillment.eta?.match(/^Pickup (.+)$/)?.[1] ?? nextPickupSlot(),
    customer_name: customerName,
    pickup_code: String(Math.floor(1000 + Math.random() * 9000)),
    lines,
    total: order.subtotal,
    status: "received",
    created_at: new Date().toISOString(),
  };
  state.orders.unshift(pickup);
  return pickup;
}
