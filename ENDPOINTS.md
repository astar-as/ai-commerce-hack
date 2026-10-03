# API endpoint reference

What each service actually exposes today, checked against the docs on Oct 3, 2026. Applies to [PLAN.md](PLAN.md) and to the home-delivery variant (DoorDash section). Keys stay in the backend; never in the frontend or the repo.

---

## ZooWork Managed Agents (developer preview)

```bash
export ZOOWORK_BASE_URL='https://clawapi.ecap.gsmo.ai/service/v1'
export ZOOWORK_API_KEY=...            # platform.zoowork.ai → API keys
# header: Authorization: Bearer $ZOOWORK_API_KEY
```
SDKs: `@zoowork-ai/sdk` (TS), `zoowork` (Python, async). Coding-agent skill: `npx skills add SerendipityOneInc/zoowork-sdk-skills`.

| Area | Endpoints | Notes |
|---|---|---|
| Models | `GET /models` | Pick from the catalog, don't hardcode. |
| Agents | `POST /agents` · `GET/PUT /agents/{id}` · `POST /agents/{id}/start` · `POST /agents/{id}/stop` | Config = model, instructions, tools, `tool_policy`, `permissions`, skills, MCP. Start the agent and wait for `status.desired_state == "running"` before creating sessions. |
| Sessions | `POST /agents/{id}/sessions` · `POST /agents/{id}/sessions/{sid}/events` · `GET /agents/{id}/sessions/{sid}/events/stream` | One session per user/thread. Send `user.message`, `user.custom_tool_result`, `user.interrupt` as events; stream replies. A stream disconnect does not cancel the run. |
| Approvals | `GET /agents/{id}/approvals` · `POST /agents/{id}/approvals/{aid}/resolve` | Permission policy per tool: `always_allow` / `always_ask`. Run status `awaiting_approval` while pending. |
| Schedules | `POST /agents/{id}/schedules` · `GET/… /schedules/{sid}` · `POST /schedules/{sid}/trigger` · `GET /schedules/{sid}/runs` | Cron + tz, payload `{kind: "agentTurn", message}`. Short intervals burn credits — pause after testing. |
| Webhooks | `POST /agents/{id}/webhooks` · `…/{wid}/update` · `…/{wid}/test` · `…/{wid}/deliveries` · `…/deliveries/{did}/redeliver` | Signed events; verify signatures. |

**Built-in tools:** `read`, `write`, `edit`, `apply_patch`, `exec`, `process`, `web_fetch`, `web_search`, `web_image_search`, `agent_db` (agent-owned structured data), memory tools (agent/actor scope), artifact publishing for generated files.
**Custom tools:** max 32 per agent. The model pauses mid-turn; our backend executes and posts `user.custom_tool_result`.
**Known limits (public API):** no managed WhatsApp/Slack/iMessage channels with Platform keys (404) — bridge chat through our backend · no credential vault / authenticated MCP — call keyed APIs from a custom tool · no ZooData/RAG provisioning API · no per-session spend cap.
Docs: [index](https://zoowork.ai/docs/llms.txt) · [boundaries](https://zoowork.ai/docs/reference/not-supported.md)

## ZooData

`POST /openapi/v2/products/search` · `/products/competitors` · `/markets/search` · `/products/categories` · `/realtime/product` · `/products/history` — Bearer auth, 1,000 free credits.
⚠️ Coverage is **Amazon + TikTok Shop** only; grocery, food delivery and maps are "coming soon". Not useful for a grocery catalog today. [zoodata.ai](https://zoodata.ai/)

## Moss (search)

```ts
import { MossClient } from "@moss-js/moss";           // browser: @moss-dev/moss-web
const moss = new MossClient(PROJECT_ID, PROJECT_KEY);
await moss.createIndex("catalog", [{ id, text, metadata }]);
await moss.loadIndex("catalog");
const r = await moss.query("catalog", "dairy-free barista milk", { topK: 5 });
```
Hybrid (semantic + keyword) search, metadata filters `$eq`, `$and`, `$in`, `$near`. Built-in embeddings (no OpenAI key). Python: `pip install moss`. Hackathon repo: [usemoss/GALLERYHACKS](https://github.com/usemoss/GALLERYHACKS).

## Band (agent ↔ agent / human rooms)

- **SDK:** `pip install "band-sdk[anthropic]"` / `npm install @band-ai/sdk`; register agents at app.band.ai → Agents → Remote Agent (UUID + API key).
- **Request API (REST):** Agent API (`/api/v1/agent`) and Human API — identity, peers, contacts, chats, messages, participants, events, context, chat tasks (beta).
- **Subscriptions API (WebSocket):** `wss://app.band.ai/api/v1/socket/websocket` — chat-room channel delivers @mentions.
- **Tools the agent's LLM gets:** `band_send_message`, `band_send_event`, `band_create_chatroom`, `band_add_participant`, `band_remove_participant`, `band_lookup_peers`, `band_list_contacts` / `band_add_contact` (opt-in).
- Also: A2A adapter/gateway, custom integration without SDK. Docs: [index](https://docs.band.ai/llms.txt)

## Tavily

`/search`, `/extract`, `/crawl`, `/map` — credits code in [HACKATHON.md](HACKATHON.md). ZooWork agents already have `web_search` / `web_fetch` built in.

## Entire (dev workflow)

CLI: `entire login`, `entire enable`, `entire status`, `entire session …`, `entire checkpoint …`, `entire search`, `entire why`, `entire recap`, `entire review`, `entire trail resume <id>`. Runners/Gates in `.entire/runners/`. [docs.entire.io](https://docs.entire.io/llms.txt)

---

## External commerce APIs (not sponsors)

### Instacart Developer Platform — online shopping path
- Base: dev `https://connect.dev.instacart.tools` · prod `https://connect.instacart.com` · header `Authorization: Bearer <key>`
- Key: **self-serve** — Instacart Developer Dashboard → API Keys → Create New API Key → Development.
- `POST /idp/v1/products/products_link` — shopping-list page. Body: `title`, `line_items[] {name, line_item_measurements[{quantity, unit}], filters (brand/health e.g. ORGANIC, VEGAN, GLUTEN_FREE), product_ids | upcs}`, optional `link_type` (`shopping_list` | `recipe`), `instructions`, `expires_in`, `landing_page_configuration {partner_linkback_url, enable_pantry_items}`. Returns `products_link_url`.
- Also: create recipe page, nearby retailers (by postal code), units of measurement. User picks the store and checks out on Instacart — no direct cart write.
- [Shopping list API](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) · [API keys](https://docs.instacart.com/developer_platform_api/get_started/api-keys)

### DoorDash Drive — own-fleet-free delivery (home-delivery variant)
- Base `https://openapi.doordash.com/drive/v2` · JWT signed with sandbox developer credentials (Developer Portal, self-serve).
- `POST /quotes` → `POST /quotes/{external_delivery_id}/accept` · `POST /deliveries` · `GET /deliveries/{external_delivery_id}` · `PATCH`/cancel · status webhooks.
- **Delivery Simulator** (portal) steps a sandbox delivery: Created → Dasher confirmed → Arrived at pickup → Picked up → Arrived at dropoff → Delivered / Cancelled — useful for triggering exception flows live.
- [About Drive](https://developer.doordash.com/docs/drive/overview/about_drive) · [Simulator](https://developer.doordash.com/docs/drive/how_to/use_delivery_simulator)

### Uber Direct — alternative (slower onboarding)
`POST https://api.uber.com/v1/customers/{customer_id}/delivery_quotes` + deliveries; sandbox robo-courier via `test_specifications`. Sandbox needs business onboarding — likely too slow for today. [Docs](https://developer.uber.com/docs/deliveries/get-started)

### Stripe — payments (test mode)
Payment Links / Checkout Sessions / Refunds in test mode; gate charges and refunds behind a ZooWork `always_ask` approval.
