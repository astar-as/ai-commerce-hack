// Receipt emails. Sends through Resend (RESEND_API_KEY) when configured; otherwise "mock" mode keeps
// the rendered email so the demo can show it at /api/receipts/<id>.
import type { Receipt } from "@/lib/types";

export type EmailResult = { to: string; mode: "sent" | "mock"; id?: string; error?: string };

const FROM = process.env.RECEIPT_FROM ?? "Basket <onboarding@resend.dev>";

const CHANNEL: Record<Receipt["channel"], string> = {
  instacart_delivery: "Home delivery",
  store_pickup: "Store pickup",
  in_store: "In store",
};

const money = (n: number) => `$${n.toFixed(2)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function receiptSubject(r: Receipt): string {
  return `Your Basket receipt · ${money(r.total)} · ${r.date}`;
}

export function renderReceiptEmail(r: Receipt, extra?: { pickup?: string }): string {
  const rows = r.lines
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${esc(l.product.name)}<br><span style="color:#6b7280;font-size:13px">${esc(l.product.size)} · ${l.qty} × ${money(l.product.price)}</span></td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${money(l.price_paid)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:16px;padding:24px">
    <p style="margin:0;color:#6b7280;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Receipt ${esc(r.id)}</p>
    <h1 style="margin:6px 0 4px;font-size:24px">Thanks for shopping with Basket</h1>
    <p style="margin:0 0 16px;color:#374151">${esc(r.store.name)} · ${CHANNEL[r.channel]} · ${r.date}</p>
    ${extra?.pickup ? `<p style="margin:0 0 16px;padding:12px;border-radius:10px;background:#eef2ff">${esc(extra.pickup)}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
      <tr><td style="padding:12px 0;font-weight:600">Total</td><td style="padding:12px 0;text-align:right;font-weight:600">${money(r.total)}</td></tr>
    </table>
  </div>
  <p style="color:#6b7280;font-size:12px;text-align:center">Basket · hackathon demo</p>
</div></body></html>`;
}

export async function sendReceiptEmail(r: Receipt, to: string, html: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { to, mode: "mock" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: receiptSubject(r), html }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "send failed"}`);
    return { to, mode: "sent", id: body.id };
  } catch (err) {
    // A failed email never fails the purchase; the receipt is still kept and viewable.
    console.warn("[receipt email]", (err as Error).message);
    return { to, mode: "mock", error: (err as Error).message };
  }
}
