# Plan: Basket — the grocer's shopping agent

A grocery shopping assistant that suggests lists, sends them to online shopping (Instacart), and helps in the store when an item is out of stock by suggesting alternatives that are on the shelf.

> Context: [HACKATHON.md](HACKATHON.md). Submission deadline **5:00 PM PST**.

---

## Pitch it as the grocer's agent

The brief judges merchant agents: *"Pick a real merchant. Pick one line of their P&L. Move it."* A shopping assistant on its own reads as a consumer app, so we pitch it as **an agent a grocer deploys for its shoppers**:

- **Revenue:** when an item is out of stock, the agent suggests a substitute the store has, so the sale isn't lost. This is the main P&L line we move.
- **Efficiency:** every "not on the shelf" report becomes a live restock signal for the store.
- **Merchant: Safeway** (synthetic inventory for SF stores). Why:
  - **The online path is real.** Safeway sells through Instacart, so "Send to Instacart" can show a real Safeway store. Whole Foods (Amazon only) and Trader Joe's (no online ordering) aren't on Instacart. ⚠️ Verify on instacart.com that SF Safeway stores show up.
  - **Stronger P&L story.** Safeway has big store brands (O Organics, Signature Select). On an out-of-stock, the agent suggests the store-brand version first — keeps the sale and usually earns more per item.
  - **Judges know it.** The mainstream SF chain, and its shelves really do run out.
  - Runner-up: Sprouts (on Instacart, diet-heavy shoppers make "still fits my diet" substitutions shine), but Safeway is the stronger P&L pitch.

## Where each sponsor tool fits

| Tech | Use it? | Role |
|---|---|---|
| **ZooWork** | ✅ Core | The agent itself. Builds meal plans and lists, and remembers household preferences (diet, allergies, budget, usual brands). Can run a weekly "Sunday list" job with Schedules. Calls our backend through custom tools for catalog search, stock checks and Instacart. Targets the $800 Best Use of ZooWork prize. |
| **Moss** | ✅ Core | Catalog search. In-store substitutes come back in under 10 ms, filtered to what's in stock at that store and to the shopper's diet. Moss has a browser (WASM) build, so in-store search can work on bad store wifi — the X-factor moment. |
| **Instacart** | ✅ Online path | The Developer Platform API (`POST /idp/v1/products/products_link`) takes our list and returns a link to a pre-filled shopping list on Instacart, where the user picks a store and checks out. It can't add to a cart directly; the link is the closest thing. |
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
        └── Instacart shopping-list API (fallback: our own mock cart)
```

- **Packages:** `@zoowork-ai/sdk`, `@moss-js/moss`, plus `@moss-dev/moss-web` for in-browser search.
- **Data:** a Safeway-style product catalog of 1–3k items — Instacart's public Market Basket product/aisle list or a generated set, including Safeway store brands (O Organics, Signature Select). Add synthetic per-store price, aisle and stock, with ~10% of items out of stock to set up the demo.
- **Keys (backend only):** `ZOOWORK_API_KEY`, Moss `project_id` / `project_key`, Instacart dev API key.

## Team split (4 people)

| Person | Owns |
|---|---|
| **1. Agent** | The ZooWork agent (persona docs, remembered preferences, custom tools) and the backend that streams its replies to the app. |
| **2. Data + search** | Safeway-style catalog with synthetic stock and aisles, the Moss index, the substitute-search endpoint, then in-browser Moss (WASM) if there's time. |
| **3. Frontend** | The mobile web app: list view, in-store mode with voice input, and the store dashboard. |
| **4. Integrations + pitch** | Instacart dev key and the "Send to Instacart" link, Entire setup, then Band shopper ↔ store agents (from ~2:30), then demo script, slides and backup video. |

**First 15 minutes, all together:** agree on the custom tool interfaces — `search_catalog`, `check_stock`, `send_to_instacart`, `report_oos` — so persons 1–3 can build in parallel against mocks.

## Timeline (deadline 5:00 PM)

| Time | Agent (1) | Data + search (2) | Frontend (3) | Integrations + pitch (4) |
|---|---|---|---|---|
| **12:15–1:00** | ZooWork key + credits; agent created and running | Moss project; catalog + synthetic Safeway stock | Scaffold Next.js; mock tool responses | Instacart dev key (check self-serve right away); install Entire |
| **1:00–2:30** | Plan-my-week flow: "2 adults, vegetarian kid, $150" → list grouped by aisle | Substitute search: in-stock, diet-filtered, store brand first | List view + in-store mode (tap "not on shelf" / voice → swap) | `send_to_instacart` tool (or mock cart fallback) |
| **2:30–3:30** | Wire real tools end to end; `report_oos` | In-browser Moss; restock data for dashboard | Store dashboard: $ retained, out-of-stock heatmap | Band shopper ↔ store agents (store agent can veto) |
| **3:30–4:15** | Bug fixes, demo hardening | Bug fixes, latency badge | UI polish | Finish Band, or drop it if not essential; draft slides |
| **4:15–5:00** | Feature freeze | Feature freeze | Feature freeze | Record backup demo video, write submission, P&L slide |

## Demo script (~3 min)

1. Ask for a weekly plan → list appears and uses remembered preferences.
2. Tap "Send to Instacart" → a real pre-filled Instacart list opens.
3. Switch to the phone in a Safeway: "They're out of Oatly Barista" → alternatives in ~4 ms, dairy-free constraint kept, O Organics option first → swap.
4. Store dashboard: "This Safeway kept $X in sales today, and here's what to restock."

## References

- [ZooWork docs](https://zoowork.ai/docs/) · [SDK skills](https://github.com/SerendipityOneInc/zoowork-sdk-skills)
- [Moss](https://github.com/usemoss/moss)
- [Instacart: Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) · [Instacart MCP](https://docs.instacart.com/developer_platform_api/guide/tutorials/mcp)
- [Band hacker guide](https://band.ai/hacker-guide)
