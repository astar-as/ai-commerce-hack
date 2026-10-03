# Plan: Basket — the grocer's shopping agent

A grocery shopping assistant that turns "what I want to cook" into a shopping list, sends it to online shopping (Instacart), and helps in the store when an item is out of stock by suggesting alternatives that are on the shelf.

> Context: [HACKATHON.md](HACKATHON.md). Submission deadline **5:00 PM PST**.

---

## Core flow — step 1 is "dish → recipe → list"

1. **Ask for a dish.** "I want to make chicken tikka masala for 4 on Thursday" (or several dishes for the week).
2. **Find a recipe.** The agent picks a recipe (its own knowledge, or `web_search` / `web_fetch` for a real recipe page it can cite), scales it to the servings, and applies the household profile (diet, allergies, dislikes).
3. **Turn ingredients into products.** One `match_ingredients` call maps every ingredient to a real in-stock product at the store (diet/allergens enforced, store brand preferred), with quantity, price and aisle. Pantry staples (salt, oil…) are asked about, not added blindly.
4. **Show the list** in the live order, grouped by aisle, with a total. The shopper edits by voice ("skip the cream, I have it").
5. **Then either** → **online:** `send_to_instacart` (Instacart's link also supports a recipe page) · **in store:** walk the aisles; "not on shelf" → `search_catalog` substitutes.

Steps 1–4 are the opening of the demo. Owners: recipe reasoning = agent (1), `match_ingredients` = data + search (2), list UI = frontend (3).

## Pitch it as the grocer's agent

The brief judges merchant agents: *"Pick a real merchant. Pick one line of their P&L. Move it."* A shopping assistant on its own reads as a consumer app, so we pitch it as **an agent a grocer deploys for its shoppers**:

- **Revenue:** when an item is out of stock, the agent suggests a substitute the store has, so the sale isn't lost. This is the main P&L line we move.
- **Efficiency:** every "not on the shelf" report becomes a live restock signal for the store.
- **Merchant: Kroger** (decided Oct 3 by Leon — replaces Safeway). **Kroger = in store, Instacart = online.**
  - **Real store data.** Kroger's public API gives one real store's shelf: products, prices, aisle numbers, stock levels, allergens, diet labels. We use Kroger On the Rhine, Cincinnati (`kroger-01400513`).
  - **Same P&L story.** Kroger has big store brands (Kroger, Simple Truth, Private Selection). On an out-of-stock, the agent suggests the store-brand version first — keeps the sale and usually earns more per item.
  - **Online = Instacart link** for any store the shopper picks (Instacart's API can't pre-select a retailer). No Kroger cart and **no Kroger login** — Kroger only needs our app keys.
  - The Safeway-style synthetic catalog stays as an offline fallback (`CATALOG_SOURCE=synthetic`).

## Where each sponsor tool fits

| Tech | Use it? | Role |
|---|---|---|
| **ZooWork** | ✅ Core | The agent itself. Builds meal plans and lists, and remembers household preferences (diet, allergies, budget, usual brands). Can run a weekly "Sunday list" job with Schedules. Calls our backend through custom tools for catalog search, stock checks and Instacart. Targets the $800 Best Use of ZooWork prize. |
| **Moss** | ✅ Core | Catalog search. In-store substitutes come back in under 10 ms, filtered to what's in stock at that store and to the shopper's diet. Moss has a browser (WASM) build, so in-store search can work on bad store wifi — the X-factor moment. |
| **Instacart** | ✅ Online path (**mock for the demo**) | The Developer Platform API (`POST /idp/v1/products/products_link`) takes our list and returns a link to a pre-filled shopping list on Instacart, where the user picks a store and checks out. It can't add to a cart directly. **No key:** the Developer Dashboard (dashboard.instacart.com) is login-only — access is by application, not self-serve — so we run on the **mock cart** (`/cart/mock`, decided Oct 3 by Oliver). The real call is implemented and switches on as soon as `INSTACART_API_KEY` is set. |
| **Kroger** (not a sponsor) | ✅ In-store data | Kroger Public API (developer.kroger.com). **Products** with `filter.locationId` give real brands, sizes, prices, **aisle numbers**, **stock level** (`HIGH` / `LOW` / `TEMPORARILY_OUT_OF_STOCK`), **allergens** and **diet declarations** for one store → imported into our catalog (`npm run kroger:import`) and the Moss index. App keys only (client credentials) — no shopper login, no cart (online goes through Instacart). Limit: Products 10k calls/day. **App registered** ("Basket Grocery Assistant"); keys in Leon's `.env`. |
| **Entire** | ✅ Nearly free | Install the CLI so our Claude Code sessions are saved with each commit. Almost no work, qualifies for the Entire prize. |
| **Band** | ⚠️ Stretch | Only worth it as a shopper agent ↔ store agent conversation across the account boundary. The store agent owns inventory and can veto a substitute (recall, age-restricted item). Fits the brief and Band's judging. If it isn't essential (Band's "delete test"), skip it. |
| **Tavily** | ❌ Skip | ZooWork already has `web_search` / `web_fetch` built in. |

### ZooWork limits that shape the design

- **No authenticated MCP.** Instacart's MCP server needs an API key header, so ZooWork can't connect to it directly. Our backend makes the Instacart call through a ZooWork custom tool.
- **No managed WhatsApp / iMessage channels with Platform API keys.** The interface is our own mobile-first web app.

## Architecture (all TypeScript)

```
Next.js mobile web app (list, in-store mode, store dashboard)
        │
Next.js API routes ── ZooWork session (streams the agent's replies to the UI)
        │                 └─ custom tools → search_catalog, check_stock,
        │                                   send_to_instacart, report_oos
        ├── Moss index: catalog (name, category, diet tags, aisle, price, in stock per store)
        ├── Kroger API: in-store product/aisle/stock import (app keys only)
        └── Instacart shopping-list API: online ordering, any retailer (fallback: our own mock cart)
```

- **Packages:** `@zoowork-ai/sdk`, `@moss-js/moss`, plus `@moss-dev/moss-web` for in-browser search.
- **Data:** a Safeway-style product catalog of 1–3k items — Instacart's public Market Basket product/aisle list or a generated set, including Safeway store brands (O Organics, Signature Select). Add synthetic per-store price, aisle and stock, with ~10% of items out of stock to set up the demo.
- **Two catalogs, one interface** (`CATALOG_SOURCE`): `kroger` = real products for one Kroger store (**default**), `synthetic` = Safeway-style offline fallback. In store: Kroger data. Online: Instacart link.
- **Keys (backend only):** `ZOOWORK_API_KEY`, Moss `MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY`, `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET`, Instacart dev API key. See `.env.example`.

## Team split (4 people)

| Person | Owns |
|---|---|
| **1. Agent — Anders** | The ZooWork agent (persona docs, remembered preferences, custom tools) and the backend that streams its replies to the app. **Status (`main`):** ✅ ZooWork agent `basket-safeway` behind `/api/delegate` (`lib/zoowork/`), used when `ZOOWORK_API_KEY` + `ZOOWORK_AGENT_ID` are set, interim OpenAI agent otherwise · ✅ agent tools in `lib/agent-tools/`: `search_catalog`, one tool per `OrderAction`, `search_order_history`, `checkout` (pickup code; delivery via owner 4's `withCheckoutUrl`), `update_profile` · ✅ household profile with automatic allergen/diet enforcement (`lib/profile/`, `GET/PUT /api/profile`) · ✅ `npm run agent:setup / agent:smoke / agent:chat` · ✅ **live on ZooWork**: agent `agt_01m41s66chsjk83jfqbpdmwnmk` (`claude-sonnet-5-5`), `npm run agent:smoke` passes pickup / profile / receipt / delivery (11–29 s per flow) · ✅ receipt re-adds get the "Bought 2 weeks ago" note like the interim agent · ZooWork env vars on Vercel **Development** only; add them to Production to switch the live site. Docs: `ZOOWORK-AGENT.md`. |
| **2. Data + search** | Safeway-style catalog with synthetic stock and aisles, the Moss index, the substitute-search endpoint, then in-browser Moss (WASM) if there's time. **Status (merged to `main` Oct 3):** ✅ synthetic Safeway-style catalog (524 products, 3 SF stores; demo: Oatly Barista out at `safeway-sf-01`) · ✅ **real Kroger catalog** imported: 581 in-store products at Kroger On the Rhine, Cincinnati (`kroger-01400513`), real prices/aisles/stock/allergens/images/UPCs · ✅ **Moss live**: indexes `kroger-catalog` + `synthetic-catalog` (project "Voice Agent"), ~2 ms warm queries — call `warmSearch()` at server start (first load ~4 s) · ✅ `search_catalog` + `check_stock`, `runTool` / `zooworkCustomTools()`, mocks, tests · ✅ **Kroger is the default catalog**; `data/kroger/demo.json` forces Oatly Barista (`kr-0019064664001`) out for the demo. `CATALOG_SOURCE=synthetic` for the offline fallback. ⚠️ Frontend still renders its own stand-in `lib/demo-catalog.ts` (Safeway `sw-0xx` ids) — switch it to `search_catalog` / `check_stock` after merging. Docs: `lib/catalog/README.md`. |
| **3. Frontend — Erik** | One-screen mobile web app on Vercel: GPT-Live voice orb + live order view (items with images, fulfillment mode). See [Frontend](#frontend-owner-3--erik). **Status (`main`):** ✅ voice orb + live order screen (fulfillment switch, swap card, aisle grouping in store) · ✅ `/api/live` (GPT-Live session) + `/api/delegate` · ✅ interim OpenAI agent in `lib/agent.ts` emitting `OrderAction`s · ✅ 18-product stand-in catalog with real images in `lib/demo-catalog.ts` · 🔜 switch to `lib/tools/search_catalog` when `data-search` merges · ✅ **Live: https://ai-commerce-hack.vercel.app** (Vercel team Astar, `OPENAI_API_KEY` set; redeploy with `vercel deploy --prod --scope astar12`). |
| **4. Integrations + pitch — Oliver** | Instacart link, Entire setup, then Band shopper ↔ store agents (from ~2:30), then demo script, slides and backup video. **Status (`main`):** ✅ `send_to_instacart` (`lib/tools/send_to_instacart.ts`, tests) — returns the **mock cart** `/cart/mock?list=…` (whole list in the URL, no storage) when there's no key, `MOCK_TOOLS=1`, or Instacart errors; `fallback_reason` says why · ✅ `POST /api/tools/send_to_instacart` · ✅ `/cart/mock` checkout preview page with a demo "Place order" button · ✅ `/api/delegate` sets `order.fulfillment.checkout_url` on every turn when mode is `instacart_delivery` (`withCheckoutUrl`), so the checkout bar works today · 🔜 **person 2:** register `sendToInstacartTool` in `lib/tools/index.ts` after merging `data-search` (no MOCKS entry — it mocks itself) · ✅ **Entire enabled** in the repo (`.entire/`, hooks in `.claude/settings.json`; checkpoints sync to `origin`) — **everyone:** install the CLI (`curl -fsSL https://entire.io/install.sh \| bash`), then `entire login` and `entire enable` in your clone. · ✅ Demo script step 2 points at the checkout preview · 🔄 **Pitch:** slide outline in [PITCH.md](PITCH.md); Band dropped in favour of the pitch. |

**First 15 minutes, all together:** agree on the custom tool interfaces — `search_catalog`, `check_stock`, `send_to_instacart`, `report_oos` — so persons 1–3 can build in parallel against mocks. The draft below is the starting point.

## Frontend (owner: 3 — Erik)

**Hosting: Vercel.** ZooWork's API runs agents, not web apps, and we need server routes for the OpenAI and ZooWork keys anyway.

**One screen, white background.** A voice orb ([ElevenLabs UI `Orb`](https://ui.elevenlabs.io), states `listening` / `thinking` / `talking`, reacts to mic and speaker volume) and under it the **live order**: product images, name, size, qty, price, swap badges ("↺ swapped from Oatly"), and a fulfillment chip (🚚 Instacart delivery · 🛍 Store pickup · 🛒 In store). The store is labeled "Safeway-style demo store".

**Voice: OpenAI GPT-Live (`gpt-live-1`) with client delegation.** GPT-Live only does the talking; ZooWork stays the brain.

```
browser ⇄ WebRTC ⇄ GPT-Live      (mic/speaker + data channel: transcripts, delegation events)
   │ POST /api/live      → server creates the session (OPENAI_API_KEY)
   │ POST /api/delegate  ← on session.delegation.created: { delegation_id, transcript, store_id, order }
   │                       → runs the ZooWork turn (owner 1) → returns { say, order }
   └ data channel: session.commentary.append { delegation_id, content: say }  → GPT-Live speaks it
```

- Cost: $0.05/min voice (billed per second), backend billed separately.
- `/api/delegate` is the **seam between frontend and agent**: `runAgentTurn({ delegation_id, transcript, order }) → { say, order, actions }` in `lib/agent.ts`. With `ZOOWORK_API_KEY` + `ZOOWORK_AGENT_ID` set it runs the **ZooWork turn** (`lib/zoowork/delegate.ts`): one ZooWork session per voice conversation, the current order and household profile posted as system notes, order tools mapped 1:1 to `OrderAction` and applied with `applyAction`. Without them it falls back to the interim OpenAI agent (`OPENAI_AGENT_MODEL`, default `gpt-6-luna`).
- Typed fallback: the "Type instead" box calls the same `/api/delegate`, so the demo still works if voice or wifi fails.

### `OrderState` — what the screen renders (needs sign-off from 1)

The order must live in **our backend / the request**, not only in ZooWork's `agent_db` — the frontend can't read `agent_db` in production. The agent changes it through order tools; `/api/delegate` returns the new state with each turn.

```ts
type OrderItem = {
  product: Product;
  qty: number;
  status: "added" | "swapped" | "out_of_stock" | "picked";
  swapped_from?: Product;
  note?: string;                  // short reason, e.g. "Store brand · dairy-free · −$1.50"
};

type OrderState = {
  fulfillment: {
    mode: "instacart_delivery" | "store_pickup" | "in_store";
    store: { id: string; name: string };
    eta?: string;
    checkout_url?: string;         // from send_to_instacart
  };
  items: OrderItem[];
  subtotal: number;
  pending?: { kind: "swap"; missing: Product; options: SearchResult[] };  // waiting for shopper confirmation
};
```

Proposed order tools for the agent (owner 1, same wiring as the tools below): `add_item { product_id, qty }`, `remove_item { product_id }`, `swap_item { product_id, substitute_product_id }` (only after the shopper confirms), `set_fulfillment { mode }`. `Product.image_url` is optional — the data owner (2) can fill it from Glasser → Serper `/shopping` (`imageUrl` per listing, $0.0022 per 40 products).

## Tool interfaces (draft — confirm in the first 15 minutes)

### How the tools are wired

- Each tool is one plain backend function in `lib/tools/<name>.ts`: `(input) => Promise<output>`.
- It's exposed two ways, with the **same input/output JSON**:
  1. **To the ZooWork agent** as an application-executed custom tool (`resource.custom_tools`: `name`, `description`, `input_schema` with `type: "object"`, optional `timeoutMs`). When the stream emits `agent.custom_tool_use` (`phase: "requested"`), the backend runs the function and calls `resolveCustomToolCall(agentId, callId, { content: [{ type: "json", value: output }] })`. On failure, resolve with the error JSON and `is_error: true` so the agent can recover.
  2. **To the frontend** as `POST /api/tools/<name>`. The in-store "not on shelf" tap calls `search_catalog` and `report_oos` **directly** — no LLM in the hot path — and only then asks the agent to explain or pick.
- **Mocks first:** each tool ships with a fixture in `mocks/<name>.json` and an env flag `MOCK_TOOLS=1`, so the agent (1) and frontend (3) can build before data + search (2) and Instacart (4) are ready.
- **Errors** (both paths): `{ "error": { "code": "not_found" | "invalid_input" | "upstream_failed", "message": string } }`.

### Shared types

> Code: `lib/types.ts` (single source, used by app and tools). Additions from Data + search: `Product.upc?` (Kroger barcode), `Product.image_url?` (filled by the Kroger import), `Store { id, name, neighborhood }`, `SearchCatalogOutput.engine?: "moss" | "local"`.

```ts
type DietTag = "vegan" | "vegetarian" | "gluten_free" | "dairy_free" | "nut_free" | "organic" | "kosher";
type Allergen = "milk" | "eggs" | "peanuts" | "tree_nuts" | "soy" | "wheat" | "fish" | "shellfish" | "sesame";

type Product = {
  id: string;            // our catalog id, e.g. "sw-000123" (not an Instacart id)
  name: string;          // "O Organics Oat Milk Original"
  brand: string;         // "O Organics"
  store_brand: boolean;  // true for O Organics / Signature Select → ranked first on substitutes
  department: string;    // "dairy eggs"
  aisle: string;         // "Dairy Alternatives"
  size: string;          // "64 fl oz"
  price: number;         // USD, default list price
  diet_tags: DietTag[];
  allergens: Allergen[];
};

type StoreStock = {
  store_id: string;      // "safeway-sf-01" (2–3 synthetic SF stores)
  product_id: string;
  in_stock: boolean;
  qty: number;
  aisle_number: string;  // "12"
  price: number;         // store price (may differ from list price)
};
```

**Moss mapping (person 2):** one Moss index per store (e.g. `safeway-sf-01`). Each doc: `id` = product id, `text` = name + brand + aisle + diet tags (what we search on), `metadata` = filter fields. Moss metadata values are **strings** (`"true"`, `"4.99"`), and filters (`$eq`, `$and`, `$in`, `$lt`) need the index **loaded locally** (`loadIndex`) — do that once at server start. One boolean field per diet tag (`vegan: "true"`) keeps `$eq` filters simple. `alpha` tunes semantic vs keyword weight.

### 1. `search_catalog` — find products or substitutes (owner: 2)

Used by the agent to build lists, and by the frontend for the in-store substitute fast path.

**Input**
```ts
{
  query: string;                 // "oat milk barista", or the product name when substituting
  store_id?: string;             // set → results include stock for that store
  substitute_for?: string;       // product id that's missing → excluded from results; ranked by
                                 // similarity, then store brand first, then smallest price difference
  in_stock_only?: boolean;       // default true when store_id is set
  diet?: DietTag[];              // every tag must match
  exclude_allergens?: Allergen[];
  max_price?: number;
  limit?: number;                // default 5, max 20
}
```

**Output**
```ts
{
  results: Array<{
    product: Product;
    score: number;               // Moss relevance score
    stock?: StoreStock;          // present when store_id is set
    price_diff?: number;         // vs substitute_for, in USD (+ = more expensive)
    reason?: string;             // short template, e.g. "Store brand · same aisle · dairy-free"
  }>;
  took_ms: number;               // Moss query time → latency badge in the UI
}
```

### 2. `check_stock` — stock, aisle and price for a list at one store (owner: 2)

Used to sort the in-store list by aisle and flag items that are out before the shopper leaves home.

**Input**
```ts
{
  store_id: string;
  product_ids: string[];         // max 100
}
```

**Output**
```ts
{
  store_id: string;
  items: StoreStock[];
  unknown_ids: string[];         // ids not in the catalog
}
```

### 3. `send_to_instacart` — turn the list into an Instacart shopping-list link (owner: 4)

Maps our list to Instacart's `POST /idp/v1/products/products_link` and returns the link. Instacart matches products by **name** (our ids aren't Instacart ids), so we send good names plus brand / health filters.

**Input**
```ts
{
  title: string;                 // "Week of Oct 5 — family of 3"
  items: Array<{
    product_id?: string;         // ours, for logging only
    name: string;                // search term on Instacart: "oat milk"
    display_text?: string;       // shown to the user: "O Organics Oat Milk, 64 fl oz"
    quantity: number;            // > 0
    unit?: string;               // only Instacart-supported units (each, oz, fl oz, lb, gallon…); default "each"
    brand?: string;              // → filters.brand_filters (case-sensitive)
    health_filters?: Array<"ORGANIC" | "GLUTEN_FREE" | "FAT_FREE" | "VEGAN" | "KOSHER" | "SUGAR_FREE" | "LOW_FAT">;
  }>;
}
```

**Output**
```ts
{
  url: string;                   // Instacart products_link_url, or our mock cart page
  item_count: number;
  mode: "instacart" | "mock";    // "mock" when there's no key or Instacart errors
}
```

Notes: cache the URL by a hash of the list and only regenerate when the list changes (Instacart's guidance). Set `landing_page_configuration.partner_linkback_url` to our app. The link can't pre-select Safeway — the shopper picks the store on Instacart.

### 4. `report_oos` — record an out-of-stock and what happened (owner: 1, dashboard reads it: 3)

Called when the shopper taps "not on shelf" (or says it), and again when they pick a substitute or skip. Feeds the store dashboard: revenue retained and restock signals.

**Input**
```ts
{
  store_id: string;
  product_id: string;                       // the missing product
  outcome: "pending" | "substituted" | "skipped";
  substitute_product_id?: string;           // required when outcome = "substituted"
  source: "shopper_tap" | "voice" | "agent";
}
```

**Output**
```ts
{
  event_id: string;
  recorded_at: string;                      // ISO timestamp
}
```

**Dashboard read (not an agent tool):** `GET /api/dashboard?store_id=…` →
`{ revenue_retained: number, substitutions: number, skipped: number, top_oos: Array<{ product: Product, reports: number }> }`.
`revenue_retained` = sum of the substitute's store price for `substituted` events. Store events in memory or a JSON file — no database needed for the demo.

### 5. `search_order_history` — past receipts, "that bread from two weeks ago" (owner: 3 — Erik, ✅ on `main`)

Registered in `lib/tools/index.ts`, so `zooworkCustomTools()` / `runTool` already expose it. Demo hook: *"Add that really good bread I bought two weeks ago"* → Acme Pain au Levain; *"my usual oat milk"* → Oatly (bought 5×) → it's out → substitute flow.

**Input** `{ query?: string; days_ago?: number; window_days?: number; limit?: number }` — query is product words ("bread", "oat milk"), adjectives are ignored; `days_ago` ≈ when they said they bought it (window defaults to ~35%, min 3 days). No query → lists recent receipts.

**Output** `{ matches: Array<{ product, qty, price_paid, receipt: { id, date, days_ago, channel, store_name }, times_bought, last_bought_days_ago }>, recent_receipts?, receipts_searched }`

Data: 8 synthetic receipts for the demo household in `lib/history/receipts.ts`, dates computed relative to today so "two weeks ago" always lands. ⚠️ Receipts reference the **demo catalog ids** (`lib/demo-catalog.ts`, `sw-001…`); when the app switches to the Kroger catalog, remap the receipt lines to Kroger product ids (same products by name). The interim agent (`lib/agent.ts`) calls it via function calling and tags re-added items "Bought 2 weeks ago" in the UI.

### 6. `match_ingredients` — recipe ingredients → real products, in one call (owner: 2, 🔜 building)

Used by the agent after it has a recipe. One call instead of one `search_catalog` per ingredient (a 12-ingredient recipe = 1 tool round trip, ~20 ms of Moss search).

**Input**
```ts
{
  store_id?: string;               // default: the demo store (kroger-01400513)
  ingredients: Array<{
    name: string;                  // "boneless chicken thighs", "garam masala"
    quantity?: number;             // recipe amount, already scaled: 1.5
    unit?: string;                 // "lb", "cup", "tbsp", "each"
    optional?: boolean;            // garnish etc.
  }>;                              // max 40
  diet?: DietTag[];                // household profile
  exclude_allergens?: Allergen[];
}
```

**Output**
```ts
{
  items: Array<{
    ingredient: string;            // echo of the input name
    product?: Product;             // best in-stock match (store brand preferred), absent if none
    stock?: StoreStock;            // aisle, price at the store
    qty: number;                   // packages to buy (≥1; 1 when sizes can't be compared)
    alternatives: Product[];       // next 2 matches, for "a different brand"
    pantry_staple: boolean;        // salt, oil, spices… → agent asks "do you have this?"
  }>;
  unmatched: string[];             // ingredient names with no in-stock match
  total: number;                   // sum of store price × qty (non-staples)
  took_ms: number;
}
```

### What is *not* a tool

- **Household preferences** (diet, allergies, budget, usual brands) live in **our backend's profile store** (`lib/profile/`, `GET/PUT /api/profile`). They're injected into every ZooWork session, learned through the agent's `update_profile` tool, and allergens/diet are enforced inside the tools. ZooWork memory alone isn't recalled automatically and can't block an unsafe product.
- **Recipe choice and meal planning** is the agent's own reasoning (plus ZooWork `web_search` / `web_fetch` for real recipes). Turning the recipe into products is `match_ingredients`.

## Timeline (deadline 5:00 PM)

| Time | Agent (1) | Data + search (2) | Frontend (3) | Integrations + pitch (4) |
|---|---|---|---|---|
| **12:15–1:00** | ZooWork key + credits; agent created and running | Moss project; catalog + synthetic Safeway stock | Scaffold Next.js; mock tool responses | Instacart dev key (check self-serve right away); install Entire |
| **1:00–2:30** | Plan-my-week flow: "2 adults, vegetarian kid, $150" → list grouped by aisle | Substitute search: in-stock, diet-filtered, store brand first | List view + in-store mode (tap "not on shelf" / voice → swap) | `send_to_instacart` tool (or mock cart fallback) |
| **2:30–3:30** | Wire real tools end to end; `report_oos` | In-browser Moss; restock data for dashboard | Store dashboard: $ retained, out-of-stock heatmap | Band shopper ↔ store agents (store agent can veto) |
| **3:30–4:15** | Bug fixes, demo hardening | Bug fixes, latency badge | UI polish | Finish Band, or drop it if not essential; draft slides |
| **4:15–5:00** | Feature freeze | Feature freeze | Feature freeze | Record backup demo video, write submission, P&L slide |

## Demo script (~3 min)

1. "I want to make chicken tikka masala for 4" → the agent picks a recipe, scales it, and the list fills in with real Kroger products (aisle, price, store brand), respecting the household's diet; it asks about pantry staples.
2. Tap "Send to Instacart" → the checkout preview (`/cart/mock`) opens with the whole list → "Place order". Say: "The real Instacart call is built; it switches on with a partner key."
3. Switch to the phone in the Kroger: "They're out of Oatly Barista" → real in-stock alternatives in ~5 ms, same aisle, dairy-free kept, store brand (Simple Truth) shown → swap.
4. Store dashboard: "This Kroger kept $X in sales today, and here's what to restock."

## References

- [ZooWork docs](https://zoowork.ai/docs/) · [SDK skills](https://github.com/SerendipityOneInc/zoowork-sdk-skills)
- [Moss](https://github.com/usemoss/moss)
- [Instacart: Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) · [Instacart MCP](https://docs.instacart.com/developer_platform_api/guide/tutorials/mcp)
- [Instacart: Get an API key](https://docs.instacart.com/developer_platform_api/get_started/api-keys) · [Instacart FAQ](https://docs.instacart.com/developer_platform_api/faq/)
- [ZooWork custom tools](https://zoowork.ai/docs/build/tools.md) · [Moss metadata filtering example](https://github.com/usemoss/moss/blob/main/examples/python/metadata_filtering.py)
- [Band hacker guide](https://band.ai/hacker-guide)
