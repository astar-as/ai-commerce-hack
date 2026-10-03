// "Add to my Kroger cart": the mock cart page links to /api/kroger/login?list=…, the shopper logs in
// to Kroger, and /api/kroger/callback puts every item into their real kroger.com cart (Cart API).
// Owner: person 4.
//
// Env (backend only): KROGER_CLIENT_ID, KROGER_CLIENT_SECRET. The redirect URI
// <origin>/api/kroger/callback must be registered on the Kroger app (localhost and the Vercel URL).

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getProduct } from "@/lib/catalog/data";
import { decodeMockCart } from "@/lib/tools/send_to_instacart";
import { addToCart, authorizeUrl, exchangeCode } from "./client";

type CartItem = { upc: string; quantity: number };

const STATE_COOKIE = "kroger_state";
const ITEMS_COOKIE = "kroger_items";
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", path: "/api/kroger", maxAge: 600 } as const;

const redirectUri = (req: NextRequest) => `${req.nextUrl.origin}/api/kroger/callback`;

function resultPage(req: NextRequest, params: Record<string, string>) {
  const res = NextResponse.redirect(new URL(`/cart/kroger?${new URLSearchParams(params)}`, req.nextUrl.origin));
  res.cookies.delete({ name: STATE_COOKIE, path: COOKIE_OPTS.path });
  res.cookies.delete({ name: ITEMS_COOKIE, path: COOKIE_OPTS.path });
  return res;
}

// Our catalog ids are "kr-<13-digit UPC>"; the Cart API wants that UPC.
export function listToCartItems(list: string): { items: CartItem[]; skipped: number } {
  const cart = decodeMockCart(list);
  const items: CartItem[] = [];
  let skipped = 0;
  for (const item of cart?.items ?? []) {
    const upc = item.product_id ? getProduct(item.product_id)?.upc : undefined;
    if (upc) items.push({ upc, quantity: Math.max(1, Math.round(item.quantity)) });
    else skipped++;
  }
  return { items, skipped };
}

export async function handleKrogerLogin(req: NextRequest) {
  const { items, skipped } = listToCartItems(req.nextUrl.searchParams.get("list") ?? "");
  if (items.length === 0) return resultPage(req, { error: "No Kroger products in this list." });

  const state = randomBytes(16).toString("hex");
  let url: string;
  try {
    url = authorizeUrl(redirectUri(req), state);
  } catch (err) {
    return resultPage(req, { error: (err as Error).message });
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, COOKIE_OPTS);
  res.cookies.set(ITEMS_COOKIE, JSON.stringify({ items, skipped }), COOKIE_OPTS);
  return res;
}

export async function handleKrogerCallback(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (params.get("error")) return resultPage(req, { error: `Kroger login: ${params.get("error")}` });

  const state = req.cookies.get(STATE_COOKIE)?.value;
  const saved = req.cookies.get(ITEMS_COOKIE)?.value;
  const code = params.get("code");
  if (!code || !state || params.get("state") !== state || !saved) {
    return resultPage(req, { error: "Login expired. Go back and try again." });
  }

  const { items, skipped } = JSON.parse(saved) as { items: CartItem[]; skipped: number };
  try {
    const token = await exchangeCode(code, redirectUri(req));
    await addToCart(token, items.map((i) => ({ ...i, modality: "PICKUP" as const })));
  } catch (err) {
    console.error("[kroger cart]", err);
    return resultPage(req, { error: "Kroger didn't accept the cart. Try again." });
  }
  const added = items.reduce((n, i) => n + i.quantity, 0);
  return resultPage(req, { added: String(added), skipped: String(skipped) });
}
