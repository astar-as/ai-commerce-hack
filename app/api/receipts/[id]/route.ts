// GET /api/receipts/<id>  — the receipt email exactly as sent (or as it would be sent in mock mode).
import { getIssuedReceipt } from "@/lib/receipts/issue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const issued = getIssuedReceipt(id);
  if (!issued) return new Response("Receipt not found (receipts are kept in memory on the server that issued them).", { status: 404 });
  return new Response(issued.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
