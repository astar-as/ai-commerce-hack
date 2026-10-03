import { CATALOG, OUT_OF_STOCK, productById } from "@/lib/demo-catalog";
import { emptyOrder, round, setFulfillment, swapInOrder, withSubtotal } from "@/lib/order-core";
import type { DietTag, OrderAction, OrderItem, OrderState, Product, SearchResult } from "@/lib/types";

export { emptyOrder };

const HARD_TAGS: DietTag[] = ["dairy_free", "vegan", "vegetarian", "gluten_free", "nut_free"];
const NOISE = new Set(
  "the and with free original organic dairy shelf stable edition fl oz lb ct pack count bag jar tub box bottle classic natural fresh made style".split(" "),
);

const coreTokens = (p: Product) => {
  const brand = new Set(p.brand.toLowerCase().split(/[^a-z0-9]+/));
  return new Set(
    p.name
      .toLowerCase()
      .replace(/oatmilk/g, "oat milk")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t))
      .filter((t) => t.length > 2 && !NOISE.has(t) && !brand.has(t) && !/^\d/.test(t)),
  );
};

export function findSubstitutes(missing: Product, limit = 3): SearchResult[] {
  const want = coreTokens(missing);
  const hardTags = missing.diet_tags.filter((t) => HARD_TAGS.includes(t));
  return CATALOG.filter(
    (p) =>
      p.id !== missing.id &&
      !OUT_OF_STOCK.has(p.id) &&
      p.department === missing.department &&
      hardTags.every((t) => p.diet_tags.includes(t)) &&
      !p.allergens.some((a) => !missing.allergens.includes(a)),
  )
    .map((p) => {
      const have = coreTokens(p);
      const shared = [...want].filter((t) => have.has(t)).length;
      const sim = shared / Math.max(1, Math.min(want.size, have.size));
      const price_diff = round(p.price - missing.price);
      const reasons = [
        p.store_brand ? "Store brand" : null,
        p.aisle === missing.aisle ? "Same aisle" : p.aisle,
        ...hardTags.slice(0, 2).map((t) => t.replace("_", "-")),
      ].filter(Boolean);
      return {
        product: p,
        score: sim * 3 + (p.store_brand ? 0.6 : 0) + (p.aisle === missing.aisle ? 0.4 : 0) - Math.min(Math.abs(price_diff), 10) * 0.08,
        shared,
        price_diff,
        reason: reasons.join(" · "),
      };
    })
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ product: r.product, score: r.score, price_diff: r.price_diff, reason: r.reason }));
}

export function applyAction(order: OrderState, action: OrderAction): OrderState {
  const items = [...order.items];
  const idx = (id: string) => items.findIndex((i) => i.product.id === id);

  switch (action.type) {
    case "add_item": {
      const product = productById(action.product_id);
      if (!product) return order;
      const i = idx(product.id);
      if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + (action.qty ?? 1) };
      else {
        const item: OrderItem = {
          product,
          qty: action.qty ?? 1,
          status: OUT_OF_STOCK.has(product.id) ? "out_of_stock" : "added",
        };
        items.push(item);
      }
      return withSubtotal({ ...order, items });
    }
    case "remove_item":
      return withSubtotal({ ...order, items: items.filter((i) => i.product.id !== action.product_id) });
    case "set_qty": {
      const i = idx(action.product_id);
      if (i < 0) return order;
      if (action.qty <= 0) return withSubtotal({ ...order, items: items.filter((_, j) => j !== i) });
      items[i] = { ...items[i], qty: action.qty };
      return withSubtotal({ ...order, items });
    }
    case "propose_swap": {
      const missing = productById(action.product_id);
      if (!missing) return order;
      const i = idx(missing.id);
      if (i >= 0) items[i] = { ...items[i], status: "out_of_stock" };
      return withSubtotal({
        ...order,
        items,
        pending: { kind: "swap", missing, options: findSubstitutes(missing) },
      });
    }
    case "swap_item": {
      const missing = productById(action.product_id);
      const sub = productById(action.substitute_product_id);
      if (!missing || !sub) return order;
      return swapInOrder(order, missing, sub);
    }
    case "dismiss_swap":
      return { ...order, pending: undefined };
    case "set_fulfillment":
      return setFulfillment(order, action.mode);
  }
}

export const applyActions = (order: OrderState, actions: OrderAction[]) => actions.reduce(applyAction, order);
