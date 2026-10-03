// Quick CLI check of the search tools.
//   npm run search -- "oat milk barista"
//   npm run search -- --sub sw-000069 --store safeway-sf-01
//   npm run search -- "pasta sauce" --diet vegan --store safeway-sf-01
import { runTool } from "../lib/tools/index";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const sub = flag("sub");
const store = flag("store");
const diet = flag("diet");
const query = args.join(" ");

const out: any = await runTool("search_catalog", {
  query,
  ...(sub && { substitute_for: sub }),
  ...(store && { store_id: store }),
  ...(diet && { diet: diet.split(",") }),
});
if (out.error) {
  console.error(out.error);
  process.exit(1);
}
console.log(`${out.engine} · ${out.took_ms} ms`);
for (const r of out.results) {
  const stock = r.stock ? ` · aisle ${r.stock.aisle_number} · ${r.stock.in_stock ? "in stock" : "OUT"} $${r.stock.price}` : "";
  const diff = r.price_diff !== undefined ? ` · ${r.price_diff >= 0 ? "+" : ""}${r.price_diff}` : "";
  console.log(`  ${r.product.id}  ${r.product.name} (${r.product.size}) $${r.product.price}${stock}${diff}${r.reason ? ` · ${r.reason}` : ""}`);
}
