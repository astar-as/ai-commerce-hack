# Pitch: slide outline (draft)

Owner: person 4 (Oliver). 6 slides, ~3 min including the live demo. Judged on: idea, technical execution (works **live**), presentation, design, X-factor.
Brief to echo: *"Pick a real merchant. Pick one line of their P&L. Move it."* — and *"an agent a merchant would pay for, and could run on Monday."*

---

## 1. Title
- **Basket — Kroger's shopping agent**
- One line: *"When the shelf is empty, Basket keeps the sale."*
- Team names + roles.

## 2. The problem (one P&L line)
- Out-of-stocks are a revenue leak: the shopper can't find the item, walks out without it, or buys it somewhere else.
- The store also finds out late: nobody tells it what's missing from the shelf.
- Say this: *"We picked one line on Kroger's P&L: sales lost to empty shelves."*
- 🔲 TODO: one sourced industry number for out-of-stock rate / lost sales. Don't use an unsourced number.

## 3. The solution
- A voice agent Kroger deploys for its shoppers, working in store and online:
  - **Plans the list** from remembered preferences (diet, allergies, budget, usual brands).
  - **Online:** sends the list to Instacart checkout.
  - **In store:** "They're out of Oatly Barista" → in-stock alternatives in milliseconds, same aisle, diet kept, **Kroger's own brand first** (Simple Truth / Private Selection).
- **Merchant value:** the sale is kept, often at a better margin (store brand), and every "not on shelf" becomes a restock signal.

## 4. Live demo (~90 s) — follows PLAN.md → Demo script
1. Voice: ask for the week's plan → the list fills in with real Kroger products and images.
2. "Send to Instacart" → checkout preview → Place order.
3. In-store mode: "They're out of Oatly Barista" → swap card → accept the store-brand alternative.
4. Store view: sales kept + what to restock. ⚠️ The dashboard isn't built yet (person 3, 2:30–3:30). If it's missing at 4:00, cut this step and say it on slide 5 instead.

Backup: the recorded video (record by ~4:30). Switch to it with no apology if live fails.

## 5. Why it's real (technical execution)
- **Real store data:** Kroger Public API, one real store (Kroger On the Rhine, Cincinnati) — 581 in-store products with real prices, aisle numbers, stock levels, allergens and diet labels.
- **Moss:** hybrid semantic search, ~2–5 ms warm queries, filtered to in stock + diet. Show the latency badge.
- **ZooWork:** the agent and its memory; our backend exposes custom tools (`search_catalog`, `check_stock`, `send_to_instacart`, `report_oos`).
- **Instacart:** shopping-list API integration built; demo runs on the checkout preview until we have a partner key.
- **Entire:** every Claude Code session is attached to our commits.
- One simple architecture diagram: voice app → agent → tools → Moss / Kroger data / Instacart.

## 6. Business case + Monday
- **Who pays:** the grocer. Basket runs on the grocer's catalog and stock feed.
- **What moves:** revenue retained on out-of-stocks (shown as sales kept $ per store per day), store-brand mix, faster restocking.
- **Running it on Monday:** plug in the store's product/stock API (Kroger works today), deploy the web app, done. No app install for shoppers.
- Close: *"Every empty shelf today is a lost sale. With Basket it's a swap, and a restock alert."*

---

## Likely judge questions
- **"Is the Instacart part real?"** — The API call is built and tested; Instacart gives developer keys by application, so the demo shows the checkout preview. It turns on with a key, with no code change.
- **"Why Kroger in Cincinnati?"** — Kroger is the one big grocer with a public API for real per-store stock and aisle data. One real store beats a synthetic one.
- **"What if the agent suggests something unsafe?"** — Substitutes are filtered by the shopper's allergens and diet before the agent sees them, not after.
- **"Why not just a search bar?"** — Search is the fast path (no LLM in the loop when the shopper taps "not on shelf"); the agent adds memory, planning and the conversation.

## Checklist
- [ ] Slides drafted (by 4:00)
- [ ] Demo rehearsed on https://ai-commerce-hack.vercel.app (by 4:15)
- [ ] Backup video recorded (by 4:30)
- [ ] Submission written + submitted at aivalley.io (before 5:00)
- [ ] Demo runnable at our station from 5:30
