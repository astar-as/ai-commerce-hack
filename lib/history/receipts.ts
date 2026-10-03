import { DEMO_STORE, productById } from "@/lib/demo-catalog";
import type { Receipt, ReceiptChannel } from "@/lib/types";

const OATLY = "kr-0019064664001";
const BANANAS = "kr-0000000004011";
const CHOBANI = "kr-0089470001013";
const EGGS = "kr-0001111006479";
const STRAWBERRIES = "kr-0003338320027";
const CHICKEN = "kr-0028334900000";
const SPINACH = "kr-0001111091128";
const IZZIO_SOURDOUGH = "kr-0065708206040";
const PARMESAN = "kr-0001111058033";
const RAOS = "kr-0074747900007";
const PENNE_PS = "kr-0001111008985";
const GARLIC = "kr-0001111002824";
const OLIVE_OIL = "kr-0001111004412";
const COFFEE = "kr-0001291901206";
const GOLDMINER = "kr-0003967707225";
const KROGER_MARINARA = "kr-0001111013416";
const KROGER_PENNE = "kr-0001111085033";
const PLANET_OAT = "kr-0004410015618";

const SPEC: Array<{ days_ago: number; channel: ReceiptChannel; lines: Array<[string, number]> }> = [
  { days_ago: 4, channel: "instacart_delivery", lines: [[OATLY, 2], [BANANAS, 1], [CHOBANI, 1], [EGGS, 1]] },
  { days_ago: 11, channel: "in_store", lines: [[OATLY, 1], [BANANAS, 1], [STRAWBERRIES, 1], [CHICKEN, 1], [SPINACH, 1]] },
  { days_ago: 15, channel: "in_store", lines: [[IZZIO_SOURDOUGH, 1], [PARMESAN, 1], [RAOS, 1], [PENNE_PS, 1], [GARLIC, 1], [OLIVE_OIL, 1]] },
  { days_ago: 18, channel: "instacart_delivery", lines: [[OATLY, 2], [BANANAS, 1], [EGGS, 1], [COFFEE, 1]] },
  { days_ago: 25, channel: "store_pickup", lines: [[GOLDMINER, 1], [CHICKEN, 1], [KROGER_MARINARA, 1], [KROGER_PENNE, 2], [CHOBANI, 1]] },
  { days_ago: 32, channel: "instacart_delivery", lines: [[OATLY, 2], [BANANAS, 1], [STRAWBERRIES, 1], [SPINACH, 1]] },
  { days_ago: 46, channel: "in_store", lines: [[IZZIO_SOURDOUGH, 1], [PLANET_OAT, 1], [BANANAS, 1], [PARMESAN, 1]] },
  { days_ago: 60, channel: "instacart_delivery", lines: [[COFFEE, 1], [OATLY, 2], [BANANAS, 1], [CHICKEN, 1]] },
];

const DAY = 86_400_000;

// Receipts issued at runtime (paid orders, see lib/receipts/issue.ts), newest first.
// In memory, kept on globalThis so dev hot reloads don't drop them.
const g = globalThis as typeof globalThis & { __basketIssuedReceipts?: Receipt[] };
const issued = (g.__basketIssuedReceipts ??= []);

export function recordReceipt(receipt: Receipt) {
  issued.unshift(receipt);
}

export function getReceipts(now = Date.now()): Receipt[] {
  const fresh = issued.map((r) => ({ ...r, days_ago: Math.floor((now - Date.parse(r.date)) / DAY) }));
  return [...fresh, ...seedReceipts(now)];
}

function seedReceipts(now: number): Receipt[] {
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
