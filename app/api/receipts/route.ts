// POST /api/receipts { list }  — the shopper paid on the checkout page: issue the receipt and email it
//                                to the household's registered address. `list` is the checkout page's
//                                encoded cart (same as /cart/mock?list=…).
// GET  /api/receipts           — receipts issued this session, newest first (with email status).
import { DEMO_PROFILE_ID, getProfile } from "@/lib/profile/store";
import { issueReceipt, linesFromIds, listIssuedReceipts, maskEmail } from "@/lib/receipts/issue";
import { decodeMockCart } from "@/lib/tools/send_to_instacart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { list?: string } | null;
  const cart = body?.list ? decodeMockCart(body.list) : null;
  const lines = cart ? linesFromIds(cart.items) : [];
  if (!lines.length) return Response.json({ error: { code: "invalid_input", message: "a non-empty cart list is required" } }, { status: 400 });

  const { receipt, email } = await issueReceipt({ channel: "instacart_delivery", lines, profile: getProfile(DEMO_PROFILE_ID) });
  return Response.json({
    receipt_id: receipt.id,
    total: receipt.total,
    emailed_to: email ? maskEmail(email.to) : null,
    email_mode: email?.mode ?? null,
    preview_url: `/api/receipts/${receipt.id}`,
  });
}

export async function GET() {
  return Response.json({
    receipts: listIssuedReceipts().map(({ receipt, email }) => ({
      id: receipt.id,
      date: receipt.date,
      channel: receipt.channel,
      total: receipt.total,
      items: receipt.lines.length,
      emailed_to: email ? maskEmail(email.to) : null,
      email_mode: email?.mode ?? null,
      preview_url: `/api/receipts/${receipt.id}`,
    })),
  });
}
