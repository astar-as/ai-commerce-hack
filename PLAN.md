# Plan: Basket — the grocer's shopping agent

A grocery shopping assistant that suggests lists, sends them to online shopping (Instacart), and helps in the store when an item is out of stock by suggesting alternatives that are on the shelf.

> Context: [HACKATHON.md](HACKATHON.md). Submission deadline **5:00 PM PST**.

---

## Pitch it as the grocer's agent

The brief judges merchant agents: *"Pick a real merchant. Pick one line of their P&L. Move it."* A shopping assistant on its own reads as a consumer app, so we pitch it as **an agent a grocer deploys for its shoppers**:

- **Revenue:** when an item is out of stock, the agent suggests a substitute the store has, so the sale isn't lost. This is the main P&L line we move.
- **Efficiency:** every "not on the shelf" report becomes a live restock signal for the store.
- Pick one real chain (e.g. Safeway or Whole Foods in SF) and use synthetic inventory for it.

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
- **Data:** a product catalog of 1–3k items — Instacart's public Market Basket product/aisle list or a generated set. Add synthetic per-store price, aisle and stock, with ~10% of items out of stock to set up the demo.
- **Keys (backend only):** `ZOOWORK_API_KEY`, Moss `project_id` / `project_key`, Instacart dev API key.

## Timeline (deadline 5:00 PM)

| Time | Work |
|---|---|
| **12:15–1:00** | Keys: ZooWork + credit code, Moss project, Instacart dev key (check right away whether it's self-serve). Scaffold Next.js, install Entire, build the catalog and Moss index. |
| **1:00–2:30** | **Core agent:** ZooWork agent with persona docs and custom tools. Flow: "Plan my week, 2 adults, vegetarian kid, $150" → list grouped by aisle. |
| **1:00–2:30, in parallel** | **In-store mode:** checklist view; tap "not on shelf" or speak the request → Moss returns in-stock alternatives (latency badge, price difference) → agent picks one and explains why → one tap to swap. |
| **2:30–3:30** | "Send to Instacart" (or mock cart fallback). Store dashboard: substitutions saved = $ retained, plus out-of-stock heatmap. |
| **3:30–4:15** | Band shopper ↔ store agents, *only if* everything above works live. Otherwise polish the UI. |
| **4:15–5:00** | Feature freeze, record a backup demo video, write the submission and the P&L slide. |

## Demo script (~3 min)

1. Ask for a weekly plan → list appears and uses remembered preferences.
2. Tap "Send to Instacart" → a real pre-filled Instacart list opens.
3. Switch to the phone in store: "They're out of Oatly Barista" → alternatives in ~4 ms, dairy-free constraint kept → swap.
4. Store dashboard: "This store kept $X in sales today, and here's what to restock."

## Open questions

- **Team size:** plan assumes 2–3 people working in parallel. Solo → drop Band and the store dashboard.
- **Merchant:** which chain do we name?

## References

- [ZooWork docs](https://zoowork.ai/docs/) · [SDK skills](https://github.com/SerendipityOneInc/zoowork-sdk-skills)
- [Moss](https://github.com/usemoss/moss)
- [Instacart: Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) · [Instacart MCP](https://docs.instacart.com/developer_platform_api/guide/tutorials/mcp)
- [Band hacker guide](https://band.ai/hacker-guide)
