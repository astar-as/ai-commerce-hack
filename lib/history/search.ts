import { getReceipts } from "@/lib/history/receipts";
import type { OrderHistoryMatch, SearchOrderHistoryInput, SearchOrderHistoryOutput } from "@/lib/types";

const STOP = new Set(
  "a an and the that this those these my our me i we you it some any of for to in on at with from bought buy got get had have last time ago week weeks month months day days really very good great nice amazing awesome lovely tasty delicious favorite favourite usual one ones stuff thing things kind type".split(
    " ",
  ),
);

const SYNONYMS: Record<string, string[]> = {
  bread: ["bread", "levain", "loaf", "sourdough", "baguette", "bakery"],
  loaf: ["bread", "levain", "loaf", "sourdough"],
  milk: ["milk"],
  oat: ["oat", "oatly"],
  coffee: ["coffee", "bean", "philz", "tesora"],
  beans: ["coffee", "bean"],
  pasta: ["pasta", "penne"],
  noodles: ["pasta", "penne"],
  sauce: ["sauce", "marinara"],
  cheese: ["cheese", "parmigiano", "parmesan"],
  parmesan: ["parmigiano", "parmesan", "cheese"],
  berries: ["strawberries", "berries"],
  fruit: ["bananas", "strawberries", "produce"],
  eggs: ["eggs"],
  chicken: ["chicken"],
  beef: ["beef"],
  meat: ["beef", "chicken", "meat"],
  greens: ["spinach", "basil"],
  herbs: ["basil"],
  yogurt: ["yogurt"],
  oil: ["oil"],
};

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

const stem = (t: string) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t);

export function searchOrderHistory(input: SearchOrderHistoryInput): SearchOrderHistoryOutput {
  const receipts = getReceipts();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  const counts = new Map<string, { times: number; last: number }>();
  for (const r of receipts)
    for (const l of r.lines) {
      const c = counts.get(l.product.id) ?? { times: 0, last: Infinity };
      counts.set(l.product.id, { times: c.times + 1, last: Math.min(c.last, r.days_ago) });
    }

  const window =
    input.days_ago === undefined ? Infinity : (input.window_days ?? Math.max(3, Math.round(input.days_ago * 0.35)));
  const inWindow = receipts.filter((r) => input.days_ago === undefined || Math.abs(r.days_ago - input.days_ago) <= window);

  const terms = [...new Set(tokenize(input.query ?? "").flatMap((t) => SYNONYMS[t] ?? SYNONYMS[stem(t)] ?? [t]).map(stem))];

  const matches: Array<OrderHistoryMatch & { score: number }> = [];
  for (const r of inWindow)
    for (const l of r.lines) {
      const hay = `${l.product.name} ${l.product.brand} ${l.product.department}`.toLowerCase();
      const hits = terms.filter((t) => hay.includes(t)).length;
      if (terms.length && hits === 0) continue;
      const c = counts.get(l.product.id)!;
      const closeness = input.days_ago === undefined ? 0 : 1 - Math.abs(r.days_ago - input.days_ago) / (window + 1);
      matches.push({
        product: l.product,
        qty: l.qty,
        price_paid: l.price_paid,
        receipt: { id: r.id, date: r.date, days_ago: r.days_ago, channel: r.channel, store_name: r.store.name },
        times_bought: c.times,
        last_bought_days_ago: c.last,
        score: hits * 2 + closeness + c.times * 0.1 - r.days_ago * 0.001,
      });
    }

  matches.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = matches.filter((m) => (seen.has(m.product.id) ? false : (seen.add(m.product.id), true)));

  return {
    matches: unique.slice(0, limit).map((m) => ({ product: m.product, qty: m.qty, price_paid: m.price_paid, receipt: m.receipt, times_bought: m.times_bought, last_bought_days_ago: m.last_bought_days_ago })),
    recent_receipts: terms.length
      ? undefined
      : inWindow.slice(0, 5).map((r) => ({
          id: r.id,
          date: r.date,
          days_ago: r.days_ago,
          channel: r.channel,
          item_count: r.lines.length,
          total: r.total,
        })),
    receipts_searched: inWindow.length,
  };
}
