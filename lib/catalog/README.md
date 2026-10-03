# Data + search

Catalog, per-store stock and the `search_catalog` / `check_stock` / `match_ingredients` tools from [PLAN.md](../../PLAN.md#tool-interfaces-draft--confirm-in-the-first-15-minutes).

## Use it

```ts
import { runTool, zooworkCustomTools, isToolError } from "./lib/tools/index";

// ZooWork agent (person 1)
createAgent({ resource: { custom_tools: zooworkCustomTools(), ... } });
// on agent.custom_tool_use:
const out = await runTool(call.name, call.input);
await zc.resolveCustomToolCall(agentId, call.callId, { content: [{ type: "json", value: out }], ...(isToolError(out) && { is_error: true }) });

// Frontend API route (person 3): POST /api/tools/[name]
return Response.json(await runTool(params.name, await req.json()));

// report_oos (person 1): trust the shopper over our snapshot
import { markOutOfStock } from "./lib/catalog/data";
```

Try it from the terminal:

```bash
npm install
npm run search -- "oat milk barista"
npm run search -- --sub kr-0019064664001 --store kroger-01400513   # demo: Oatly Barista is out → substitutes
npm run search -- "pasta sauce" --diet vegan --store kroger-01400513
npm test
```

## Pieces

| File | What |
|---|---|
| `lib/types.ts` | Shared types (the contract in PLAN.md, shared with the app) |
| `lib/catalog/data.ts` | Loads catalog + stock (`CATALOG_SOURCE=kroger` default \| `synthetic`), `defaultStore()`, `markOutOfStock` |
| `lib/catalog/moss.ts` | Moss index docs, filters, query |
| `lib/catalog/ingredients.ts` | `match_ingredients`: recipe ingredients → in-stock products, package count, pantry staples, total |
| `lib/catalog/search.ts` | Retrieval → filters → stock → substitute ranking (store brand, same aisle, price) |
| `lib/tools/*` | Tool declarations for ZooWork + `runTool` registry, `MOCK_TOOLS=1` returns `mocks/*.json` |
| `lib/kroger/client.ts` | Kroger API (app keys only, no shopper login): locations, products |
| `scripts/seeds.ts` | ~190 grocery staples: seeds the synthetic catalog and the Kroger search terms |

## Data sources

Kroger is the **in-store** data source (real shelf, aisle, stock). Online ordering goes through **Instacart** (`send_to_instacart`, person 4). No Kroger shopper login anywhere.

- **Kroger (default, real):** `data/kroger/*.json` — 4,014 in-store products (≈300 search terms × up to 50 results, plus gap fills via `KROGER_TERMS` merge mode; Kroger has no "list all products" API) at Kroger On the Rhine, Cincinnati (`kroger-01400513`): real brands, sizes, prices, aisle numbers, stock levels, images, allergens and diet declarations. Refresh with `npm run kroger:import` (needs `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET`), then `npm run moss:index`.
  - **Demo override:** `data/kroger/demo.json` marks Oatly Barista (`kr-0019064664001`) out of stock so the substitute demo always works. Add ids there for more demo cases.
- **Synthetic (offline fallback):** `data/*.json` — 524 Safeway-style products, 3 made-up SF stores. `CATALOG_SOURCE=synthetic`. Used by the unit tests.

## Search engine

- **Moss** when `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` are set: build the index with `npm run moss:index` (per catalog source). One product-level index; diet tags and allergens are `diet_*` / `allergen_*` string metadata used as `$eq` filters. Stock is applied after retrieval, so out-of-stock reports work without reindexing.
- **Warm-up:** the first query in a server process downloads the index (~4 s); after that queries take ~2 ms. Call `warmSearch()` from `lib/catalog/search` at server start (Next.js `instrumentation.ts` `register()`). `took_ms` measures the search only.
- **Indexes built** (Moss project "Voice Agent"): `kroger-catalog` (581 docs) and `synthetic-catalog` (524 docs). Rebuild after re-importing: `CATALOG_SOURCE=<source> npm run moss:index`.
- **Local keyword fallback** otherwise — same output, `engine: "local"`.
- **Substitutes** (`substitute_for`): same department, keep the original's vegan / vegetarian / gluten-free / dairy-free / nut-free tags, in stock at the store, ranked by relevance + store brand + same aisle − price gap.

## match_ingredients (dish → recipe → list)

The agent picks and scales a recipe, then sends the whole ingredient list in **one** call (one tool round trip instead of one `search_catalog` per ingredient). Per ingredient:

- **Search:** `searchCatalog` (Moss), in stock at the store, household `diet` / `exclude_allergens` applied.
- **Sanity check:** the ingredient's last word must be in the product name, and so must the other words (≤3 words: all; longer: all but one). So "ground beef" never becomes a ribeye, and it comes back as `unmatched` instead.
- **Pick:** best *name fit* first (fewest extra words; words like spray / spread / blend / patties / microwave cups count as a different product unless the recipe says so; small store-brand bonus), then among near-equal fits the cheapest way to cover the recipe amount (packages × store price).
- **Quantity:** recipe amount ÷ package size (lb/oz/g, cups/tbsp/fl oz/gal, counts; mass↔volume at water density; garlic cloves ≈ 1/10 head; capped at 12). 1 when sizes can't be compared.
- **Pantry staples** (salt, oil, spices, flour…) are matched but flagged `pantry_staple` and left out of `total`, so the agent asks first. `water` is never a product.

```bash
npx tsx --env-file=.env -e 'import { runTool } from "./lib/tools/index"; runTool("match_ingredients", { ingredients: [{ name: "boneless skinless chicken thighs", quantity: 2, unit: "lb" }, { name: "heavy cream", quantity: 1, unit: "cup" }, { name: "garam masala" }] }).then((r) => console.log(JSON.stringify(r, null, 1)))'
```
