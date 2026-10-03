import { DEMO_STORE, productById } from "@/lib/demo-catalog";
import type { Receipt, ReceiptChannel } from "@/lib/types";

const SPEC: Array<{ days_ago: number; channel: ReceiptChannel; lines: Array<[string, number]> }> = [
  { days_ago: 4, channel: "instacart_delivery", lines: [["sw-001", 2], ["sw-012", 1], ["sw-013", 1], ["sw-021", 1]] },
  { days_ago: 11, channel: "in_store", lines: [["sw-001", 1], ["sw-012", 1], ["sw-020", 1], ["sw-016", 1], ["sw-010", 1]] },
  { days_ago: 15, channel: "in_store", lines: [["sw-019", 1], ["sw-009", 1], ["sw-007", 1], ["sw-006", 1], ["sw-014", 1], ["sw-011", 1], ["sw-018", 1]] },
  { days_ago: 18, channel: "instacart_delivery", lines: [["sw-001", 2], ["sw-012", 1], ["sw-021", 1], ["sw-022", 1]] },
  { days_ago: 25, channel: "store_pickup", lines: [["sw-017", 1], ["sw-015", 1], ["sw-008", 1], ["sw-005", 2], ["sw-013", 1]] },
  { days_ago: 32, channel: "instacart_delivery", lines: [["sw-001", 2], ["sw-012", 1], ["sw-020", 1], ["sw-010", 1]] },
  { days_ago: 46, channel: "in_store", lines: [["sw-019", 1], ["sw-003", 1], ["sw-012", 1], ["sw-009", 1]] },
  { days_ago: 60, channel: "instacart_delivery", lines: [["sw-022", 1], ["sw-001", 2], ["sw-012", 1], ["sw-016", 1]] },
];

const DAY = 86_400_000;

export function getReceipts(now = Date.now()): Receipt[] {
  return SPEC.map((r, i) => {
    const lines = r.lines.flatMap(([id, qty]) => {
      const product = productById(id);
      return product ? [{ product, qty, price_paid: Math.round(product.price * qty * 100) / 100 }] : [];
    });
    return {
      id: `rcpt-${String(i + 1).padStart(3, "0")}`,
      date: new Date(now - r.days_ago * DAY).toISOString().slice(0, 10),
      days_ago: r.days_ago,
      store: DEMO_STORE,
      channel: r.channel,
      lines,
      total: Math.round(lines.reduce((s, l) => s + l.price_paid, 0) * 100) / 100,
    };
  });
}
