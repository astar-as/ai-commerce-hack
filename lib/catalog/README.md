# Data + search

Catalog, per-store stock and the `search_catalog` / `check_stock` tools from [PLAN.md](../../PLAN.md#tool-interfaces-draft--confirm-in-the-first-15-minutes).

## Use it

```ts
import { runTool, zooworkCustomTools, isToolError } from "./lib/tools/index.ts";

// ZooWork agent (person 1)
createAgent({ resource: { custom_tools: zooworkCustomTools(), ... } });
// on agent.custom_tool_use:
const out = await runTool(call.name, call.input);
await zc.resolveCustomToolCall(agentId, call.callId, { content: [{ type: "json", value: out }], ...(isToolError(out) && { is_error: true }) });

// Frontend API route (person 3): POST /api/tools/[name]
return Response.json(await runTool(params.name, await req.json()));

// report_oos (person 1): trust the shopper over our snapshot
import { markOutOfStock } from "./lib/catalog/data.ts";
```

Try it from the terminal:

```bash
npm install
npm run search -- "oat milk barista"
npm run search -- --sub sw-000069 --store safeway-sf-01      # demo: Oatly Barista is out → substitutes
npm run search -- "pasta sauce" --diet vegan --store safeway-sf-01
npm test
```

## Pieces

| File | What |
|---|---|
| `lib/catalog/types.ts` | Shared types (the contract in PLAN.md) |
| `lib/catalog/data.ts` | Loads catalog + stock (`CATALOG_SOURCE=synthetic\|kroger`), `markOutOfStock` |
| `lib/catalog/moss.ts` | Moss index docs, filters, query |
| `lib/catalog/search.ts` | Retrieval → filters → stock → substitute ranking (store brand, same aisle, price) |
| `lib/tools/*` | Tool declarations for ZooWork + `runTool` registry, `MOCK_TOOLS=1` returns `mocks/*.json` |
| `lib/kroger/client.ts` | Kroger API: locations, products, `addToCart` (needs the shopper's OAuth token) |
| `scripts/seeds.ts` | ~190 grocery staples: seeds the synthetic catalog and the Kroger search terms |

## Data sources

- **Synthetic (default):** `data/*.json` — 524 Safeway-style products, 3 SF stores, ~10% out of stock. Demo case: at `safeway-sf-01` Oatly Barista (`sw-000069`) is out; Signature Select Barista is in. Regenerate with `npm run catalog:generate`, then `npm run mocks:generate`.
- **Kroger (real):** `npm run kroger:import` with `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET` → `data/kroger/*.json` for one store (real brands, sizes, prices, aisle numbers, stock levels, UPCs for the Cart API). Diet tags and allergens are inferred from the seed item — Kroger's public API has no allergens. Then `CATALOG_SOURCE=kroger`.

## Search engine

- **Moss** when `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` are set: build the index with `npm run moss:index` (per catalog source). One product-level index; diet tags and allergens are `diet_*` / `allergen_*` string metadata used as `$eq` filters. Stock is applied after retrieval, so out-of-stock reports work without reindexing.
- **Local keyword fallback** otherwise — same output, `engine: "local"`.
- **Substitutes** (`substitute_for`): same department, keep the original's vegan / vegetarian / gluten-free / dairy-free / nut-free tags, in stock at the store, ranked by relevance + store brand + same aisle − price gap.
