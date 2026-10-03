type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const price = (v: unknown) => (typeof v === "number" ? ` $${v.toFixed(2)}` : "");

export function describeToolStart(name: string, input: unknown): string | null {
  const i = obj(input);
  switch (name) {
    case "search_catalog":
      return i.substitute_for ? "Looking for something on the shelf to replace it." : `Searching the shelf for "${str(i.query)}".`;
    case "search_order_history":
      return `Looking through their past receipts${str(i.query) ? ` for ${str(i.query)}` : ""}.`;
    case "match_ingredients":
      return `Matching ${arr(i.ingredients).length || "the"} recipe ingredients to products in the store.`;
    case "checkout":
      return "Placing the order now.";
    case "update_profile":
      return "Saving that to the household profile.";
    default:
      return null;
  }
}

export function describeToolEnd(name: string, ok: boolean, output: unknown): string | null {
  if (!ok) return null;
  const o = obj(output);
  switch (name) {
    case "search_catalog": {
      const hits = arr(o.results).slice(0, 3);
      if (!hits.length) return "Nothing matching on the shelf.";
      return `Found: ${hits
        .map((h) => {
          const p = obj(h.product);
          const nm = str(h.name) || str(p.name);
          const oos = h.in_stock === false || h.out_of_stock === true;
          return `${nm}${price(h.price ?? p.price)}${oos ? " (out of stock)" : ""}`;
        })
        .join("; ")}.`;
    }
    case "search_order_history": {
      const m = arr(o.matches).slice(0, 2);
      if (!m.length) return "No matching past purchase.";
      return `From their receipts: ${m
        .map((x) => {
          const p = obj(x.product);
          const r = obj(x.receipt);
          const nm = str(x.name) || str(p.name);
          const days = x.days_ago ?? r.days_ago;
          return `${nm}${typeof days === "number" ? `, bought ${days} days ago` : ""}${typeof x.times_bought === "number" && x.times_bought > 1 ? `, ${x.times_bought} times` : ""}`;
        })
        .join("; ")}.`;
    }
    case "match_ingredients": {
      const items = arr(o.items).filter((x) => x.product).slice(0, 4);
      const names = items.map((x) => str(obj(x.product).name)).filter(Boolean);
      return names.length ? `Matched products like ${names.join(", ")}.` : null;
    }
    case "propose_swap": {
      const opt = arr(obj(o.pending_swap).options)[0];
      return opt ? `It's out of stock; best swap on the shelf is ${str(opt.name)}${price(opt.price)}.` : null;
    }
    case "checkout":
      return str(o.pickup_code) ? `Pickup booked: code ${str(o.pickup_code)}, ${str(o.slot)}.` : "Checkout link is ready.";
    default:
      return null;
  }
}
