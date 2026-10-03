# Basket stakeholder research

Research checked October 3, 2026. This evaluates the proposal in [PLAN.md](PLAN.md) against the opening-ceremony deck in the companion `disney-commerce-hackathon` repository and the linked first-party sources below. It is a product and demo assessment, not evidence of a commercial relationship with any retailer or platform.

## Decision

**Build the merchant's out-of-stock recovery agent.** The user-facing flow is: a shopper cannot find an item → Basket finds safe, plausible alternatives from a *demo* store catalog → the shopper chooses → the store sees a restock signal and the value of accepted substitutions. This is a better match for the host's brief than leading with a general meal planner. Keep Instacart as an optional list handoff and Band as a distinct store-agent handoff only if the core loop works live.

The opening deck (slides 12–16, 66) says the shopper now has an agent, the merchant needs one too, and teams should pick a real merchant and one P&L line. It judges viability, live technical execution, presentation, design, and surprise. The [organizer's event page](https://www.aivalley.io/events/6bbloggr) lists merchant operations, inventory, physical retail and agents as tracks. It gives event hours as **PDT**. Files that say the 5 PM deadline is PST should say **5 PM PDT**.

## Stakeholder map

| Stakeholder | Incentive / decision | What Basket must show | Main constraint / risk | Priority |
|---|---|---|---|---|
| Grocery merchant (Safeway as the *example*) | Keep a sale and spot recurring shelf gaps | Accepted substitute and actionable out-of-stock report | No retailer partnership or live stock feed; simulated data must be labeled | Core |
| Shopper | Finish the trip without a poor or unsafe substitute | Price, size, reason and clear confirmation; diet/allergen rules | Catalog tags are not a substitute for package-label verification | Core |
| Store associate / manager | Fix genuine shelf gaps without alert spam | Repeated reports ranked by store and SKU; dismiss/confirm state | A shopper's “not on shelf” report does not prove warehouse stockout | Core |
| ZooWork (host and sponsor) | Show a deployable merchant agent | Agent chooses/justifies substitutions and turns reports into store actions | A static search UI alone does not demonstrate an agent | Core |
| AI Valley / judges | See a viable, working, legible demo | One complete live transaction and honest business metric | Too many integrations weaken reliability and clarity | Core |
| Moss (sponsor) | Demonstrate useful low-latency retrieval | Catalog search with explicit stock and diet filters; measured latency | Query time is not end-to-end shopper latency | Strong fit |
| Band (sponsor) | Show consequential multi-agent coordination | Shopper agent asks store agent to confirm or veto a candidate; room records the decision | Decorative chat adds complexity without value | Conditional |
| Entire (sponsor) | Preserve development context | Checkpoints attached to actual commits | It is a development aid, not a merchant feature | Supporting |
| Instacart (external) | Convert lists into shoppable marketplace pages | Open a generated list; shopper chooses retailer and items | Developer Platform cannot force Safeway or prove a purchase | Optional |
| Tavily (sponsor) | Supply sourced external information | Only add if a live external fact is required, e.g. recall check | Web search is not authoritative store inventory | Optional |
| Novita AI (sponsor) | Supply model inference | Use via ZooWork's available model catalog if suitable | Separate integration has no clear user value | Indirect |
| DoorDash Drive / Uber Direct / Stripe | Delivery and payments | None for the core demo | More onboarding, approvals and failure paths | Defer |
| Auki / Cactus (market reference) | Spatial store intelligence | Potential future product-location layer | It is an existing product, not an event sponsor or Basket integration | Reference |

## Merchant, staff and shopper

**Merchant.** Safeway is a recognizable San Francisco example and its own-brands page lists [Signature Select and O Organics](https://www.safeway.com/about-us/our-brands.html). [Instacart lists Safeway among San Francisco grocery options](https://www.instacart.com/grocery-delivery/ca/near-me-in-san-francisco-ca). Neither fact grants Basket retailer access. The proposal's prices, aisles and inventory are synthetic; the UI and pitch should say “Safeway-style demo store,” or use an invented grocer to avoid implying endorsement. Do not assume a private-label substitute has a higher margin: that requires actual margin data.

**Staff.** Separate “shopper could not find it,” “shelf confirmed empty,” and “backroom/system inventory unavailable.” Those are different operational events. Deduplicate reports by store/SKU/time window and let staff verify them. A manager should see the number of reports, affected items and one recommended action, not an unbounded heatmap. No camera-based attention or actual shelf-position data exists in the current plan.

**Shopper.** Treat diet and allergen filters as hard gates, then rank eligible candidates by function, size and price. Ask for shopper confirmation before changing a list. Show the source of any allergy statement and direct the shopper to check the package label; generated tags alone cannot establish safety. Avoid making health or glucose claims, which are outside the hackathon concept and raise a different evidence burden. Instacart's [developer guidelines](https://docs.instacart.com/developer_platform_api/guide/terms_and_policies/developer_guidelines/) also call for credible sourcing for health-related advice.

## Event partners

### ZooWork — primary product integration

The opening deck calls ZooWork an agent delivery platform and sets the bar at an agent a merchant would pay for and could run on Monday. Basket's best ZooWork moment is a decision with tools and state: receive an out-of-stock report, fetch eligible substitutes, explain the tradeoff, obtain shopper confirmation, and create a staff-facing follow-up. A meal-plan chat is useful context but is not the merchant value proposition. The repo's [ENDPOINTS.md](ENDPOINTS.md) documents the team's API research and known limitations; verify live API behavior with a smoke test before the presentation. Avoid promising managed WhatsApp, ZooData grocery coverage, or production deployment without a working test. [ZooWork docs](https://zoowork.ai/docs/)

### Moss — strong technical fit

Moss describes hybrid retrieval, metadata filtering and a browser/WASM runtime in its [official repository](https://github.com/usemoss/moss). This fits a local substitute catalog. The demo should distinguish **retrieval latency** from **tap-to-result latency**. Product eligibility must be enforced with explicit stock, allergen and diet data; semantic similarity alone is insufficient. If browser loading or indexing becomes risky, run server-side Moss for the core demo and show browser mode only after it works reliably.

### Band — valuable only for a genuine handoff

Band's [hacker guide](https://www.band.ai/hacker-guide) says the room should change the work: a dependent handoff, runtime participant choice or a human approval, with visible mention routing. A credible Basket use is a shopper agent proposing a substitute, a store agent checking store-owned constraints or a recall flag, and the first agent revising the recommendation after a veto. Show the room log. If both “agents” merely repeat the same catalog result, omit Band. Cross-account contacts require both sides' consent; two team-owned agents are simpler for a hackathon demo.

### Entire — supporting workflow

[Entire documents Codex integration](https://docs.entire.io/agents/codex) and [session checkpoints](https://docs.entire.io/guides/checkpoints/capture-checkpoints). Enable it for genuine build commits if the team wants a development-process story, then keep the consumer demo focused on Basket. Its value is traceability of decisions and work, not retail conversion.

### Tavily and Novita AI — limited incremental value

[Tavily's Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search) could support sourced external checks, but cannot establish store-level stock. Use it only for a question the catalog cannot answer and display the source. Novita is described in the opening deck as sponsoring open-source models inside ZooWork; its [model catalog](https://novita.ai/models/llm) is relevant to model choice, but a separate Novita integration would add little to this flow.

## External commercial platforms

**Instacart.** Its [shopping-list flow](https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list) creates a link on which the shopper selects a preferred store, reviews matched products and adds them to a cart. Its [FAQ](https://docs.instacart.com/developer_platform_api/faq/) says directing a user to a specified merchant is unsupported. The [API reference](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) confirms name-based matching and optional brand/health filters; it does not guarantee the exact SKU, Safeway choice, checkout or conversion. Development keys and endpoint access must be tested early. The [getting-started guide](https://docs.instacart.com/developer_platform_api/get_started/overview/) estimates 30–40 days from access request to demo approval/production access, so this is a prototype handoff, not a production go-live claim.

**DoorDash Drive.** The [simulator](https://developer.doordash.com/en-US/docs/drive/how_to/use_delivery_simulator/) can demonstrate sandbox delivery states, but DoorDash says production access is limited and gives no certification timeline. Delivery exceptions are a different product. Defer it.

**Uber Direct and Stripe.** These are listed in [ENDPOINTS.md](ENDPOINTS.md), but delivery and payment do not help prove the out-of-stock recovery loop. Avoid payment collection and refund flows in the primary demo. If later added, use test mode and explicit human approval for consequential actions. [Stripe testing docs](https://docs.stripe.com/testing)

**Auki / Cactus.** Auki's [retail product page](https://www.auki.com/solutions/industries/retail) describes product-location capture and spatial store operations. It validates the importance of shelf-level information but also shows that a broad “map the store” pitch is not distinctive on its own. Basket can start from shopper-reported shelf gaps and later integrate verified location data. The earlier circulating CactusXR summary has weak citations for gaze tracking and CCTV specifics; do not treat those details as established requirements.

## What to measure and say

| Measure | Can the demo establish it? | Honest label |
|---|---|---|
| Shopper selected a substitute | Yes, in the app | Accepted substitutions |
| Price of accepted alternatives | Yes, from *demo* prices | Value of accepted substitutions |
| Merchant revenue gained | No purchase or counterfactual observed | Do not claim as measured revenue |
| Store stockout rate | No, shopper report is not inventory proof | Shopper-reported missing items |
| Search speed | Yes, with instrumentation | Moss query p50/p95 and tap-to-result p50/p95 separately |
| Staff response | Yes, if a task is acknowledged | Reports reviewed / tasks closed |
| Instacart conversion | No, list-link creation is not checkout | Links opened, if instrumented |

For a future pilot, obtain merchant permission and real inventory, compare stores or time periods, and measure completed substitute sales, gross margin, repeat reports, staff effort and false alerts. Until then, use a scenario such as “one accepted $4.99 substitute” rather than “$4.99 revenue recovered.”

## Recommended demo order

1. Show one shopper list at a labeled demo store. Mark one item unavailable in the fixture.
2. Shopper reports it missing. Moss returns eligible alternatives; hard filters remove prohibited products.
3. ZooWork explains the top two choices and asks the shopper to choose. The store brand is an option when genuinely eligible, not a forced winner.
4. Store dashboard shows the report, its verification state and the accepted substitute's *demo value*.
5. If stable, show the Band store-agent veto or Instacart list handoff. Show exactly what those integrations did.

This makes the core flow demonstrable even if an optional service is unavailable. The deck asks that primary features work live; rehearse this sequence on the actual demo network and keep a recording as backup.

## Open decisions for the team

- Is Safeway merely a recognizable scenario, or is there permission and actual store data? Use “Safeway-style demo store” until confirmed.
- Does the team have a working ZooWork agent and keys, or only an API plan? Run the end-to-end tool call before adding secondary features.
- Can Moss index/load/query reliably within the app's startup budget? Measure it on the demo device.
- Is Band coordination essential enough to show a veto and revision live? Decide after the core flow works.
- Is Instacart developer access already granted? If not, demo the internal list and avoid making the external link a primary feature.

## Source hierarchy

The opening deck and [AI Valley event page](https://www.aivalley.io/events/6bbloggr) govern event fit. Vendor documentation governs API behavior. [PLAN.md](PLAN.md) and [ENDPOINTS.md](ENDPOINTS.md) record team intentions and earlier research; they do not establish working integrations. Claims about Safeway performance, margin, live stock, shopper conversion or Cactus camera tracking require additional evidence.
