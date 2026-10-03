// Issue a receipt for a paid order and email it to the household's registered address.
// Called automatically by checkout (pickup) and by the checkout page's "Place order" (delivery).
import { DEMO_STORE, productById } from "@/lib/demo-catalog";
import { recordReceipt } from "@/lib/history/receipts";
import { newId } from "@/lib/store/memory";
import type { Profile } from "@/lib/profile/store";
import type { Product, Receipt, ReceiptChannel } from "@/lib/types";
import { renderReceiptEmail, sendReceiptEmail, type EmailResult } from "./email";

export type IssuedReceipt = { receipt: Receipt; email?: EmailResult; html: string };

// Kept for the preview route (/api/receipts/<id>); newest first.
const g = globalThis as typeof globalThis & { __basketReceiptMail?: Map<string, IssuedReceipt> };
const mail = (g.__basketReceiptMail ??= new Map());

const round = (n: number) => Math.round(n * 100) / 100;

export function getIssuedReceipt(id: string): IssuedReceipt | undefined {
  return mail.get(id);
}

export function listIssuedReceipts(): IssuedReceipt[] {
  return [...mail.values()].reverse();
}

export async function issueReceipt(input: {
  channel: ReceiptChannel;
  lines: Array<{ product: Product; qty: number }>;
  profile?: Profile;
  pickup?: string; // e.g. "Pickup Today 5:30 PM · code 4821"
}): Promise<IssuedReceipt> {
  const lines = input.lines.map(({ product, qty }) => ({ product, qty, price_paid: round(product.price * qty) }));
  const receipt: Receipt = {
    id: newId("rcpt"),
    date: new Date().toISOString().slice(0, 10),
    days_ago: 0,
    store: DEMO_STORE,
    channel: input.channel,
    lines,
    total: round(lines.reduce((sum, l) => sum + l.price_paid, 0)),
  };
  recordReceipt(receipt); // now searchable by search_order_history
  const html = renderReceiptEmail(receipt, { pickup: input.pickup });
  const email = input.profile?.email ? await sendReceiptEmail(receipt, input.profile.email, html) : undefined;
  const issued = { receipt, email, html };
  mail.set(receipt.id, issued);
  return issued;
}

// Lines from product ids (the checkout page only knows ids and quantities).
export function linesFromIds(items: Array<{ product_id?: string; quantity: number }>) {
  return items.flatMap((i) => {
    const product = i.product_id ? productById(i.product_id) : undefined;
    return product && i.quantity > 0 ? [{ product, qty: i.quantity }] : [];
  });
}

export const maskEmail = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");
