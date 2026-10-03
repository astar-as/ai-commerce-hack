# Data sources, MCP servers and protocols — what we can actually use today

Researched Oct 3, 2026 (live-probed where marked ✅). Companion to [ENDPOINTS.md](ENDPOINTS.md).
**ZooWork rule:** an agent can only attach a remote MCP that needs **no auth headers** (no credential vault). Either it's anonymous, or the key goes in the URL (plain text in agent config → use restricted/test keys). Everything else goes through our backend as a custom tool.

---

## 1. Attach directly to a ZooWork agent (no auth) ✅ live-tested

| MCP URL | What | Notes |
|---|---|---|
| `https://gateway.pipeworx.io/kroger/mcp` | **Real Kroger store data**: `kroger_store_locator`, `kroger_product_search`, `kroger_product_details` | zip 94103 → **Foods Co, 1800 Folsom St, SF** with live price, stock level (HIGH/LOW/OUT), aisle. Third-party wrapper, ~**50 calls/day per IP** (shared if all ZooWork agents egress from one IP) → keep a backend fallback. |
| `https://gateway.pipeworx.io/openfoodfacts/mcp` | Barcode → allergens, ingredients, nutrition | Use `toolFilter` (gateway adds ~36 unrelated tools). |
| `https://gateway.pipeworx.io/openfda/mcp` | `fda_food_recalls` | "Don't suggest a recalled substitute" — a veto signal. |
| `https://gateway.pipeworx.io/recipes/mcp` | TheMealDB recipes | Meal plans → ingredient lists. |
| `https://catalog.shopify.com/api/ucp/mcp` | Shopify's global catalog: `search_catalog`, `lookup_catalog`, `get_product` | Every call needs `meta: {"ucp-agent": {"profile": "https://shopify.dev/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json"}}` — put in agent instructions. |
| `https://{shop-domain}/api/ucp/mcp` | Any Shopify store: catalog + **cart + checkout** (anonymous can't complete purchase / read orders) | Works on e.g. allbirds.com. Safeway/Kroger are not Shopify. |
| `https://mcp.trychannel3.com/` | 100M+ retail products, similar items, price history | Weak for groceries. |

**Key-in-URL (works, key visible in config):** Google Maps Grounding Lite `https://mapstools.googleapis.com/mcp?key=…` (places, routes, weather) · ZooData `https://api.zoodata.ai/mcp?api-key=…` (57 tools, Amazon + TikTok Shop) · Tavily `https://mcp.tavily.com/mcp/?tavilyApiKey=…` · Browserbase · Zapier.
**Backend only (header/OAuth):** Instacart MCP, Stripe MCP, PayPal, Square, Apify, Composio, Pipedream, Band MCP, Moss MCP (local), DoorDash (community, local).
**Moss via MCP:** self-host `agora-moss` (one tool `search_knowledge_base`, keys in server env) on a public URL → attachable to ZooWork.

## 2. Grocery / product data (backend)

| Source | Data | Access | Verdict |
|---|---|---|---|
| **Kroger Public API** | Products + per-store regular/promo price, `inventory.stockLevel`, `aisleLocations`; store locator; **cart add** (`PUT /v1/cart/add`, needs user OAuth) | Self-serve at developer.kroger.com (instant? unverified). Token: `POST https://api.kroger.com/v1/connect/oauth2/token` (client_credentials, `scope=product.compact`); `GET /v1/locations?filter.zipCode.near=94103`; `GET /v1/products?filter.term=…&filter.locationId=…` | **Only official real-time price/stock/aisle source.** Register now; snapshot results to JSON as fallback. |
| Open Food Facts ✅ | Allergens, ingredients, nutrients by UPC | No key; custom User-Agent; ~15 reads/min | Use. ODbL attribution. |
| USDA FoodData Central ✅ | Branded foods w/ UPC, nutrients | `DEMO_KEY` now; real key by email in minutes | Backup. |
| TheMealDB ✅ | Recipes | No key | Use. |
| Instacart IDP | **No product data** — only creates a hosted list/recipe page (`products_link`) | Self-serve dev key | Hand-off only. |
| Open Prices ✅ | Crowd-sourced shelf prices | No key | Sparse; filler only. |
| UPCitemdb ✅ | UPC → title/images | 100/day trial | Fallback. |
| Spoonacular | Recipes, products, cost estimates | 50 points/day | Tight quota. |
| Walmart.io | Online price/stock | RSA-signed requests + affiliate approval | Skip. |
| Safeway/Albertsons, Target, Amazon Fresh/Whole Foods | — | No public API (scraping = ToS breach) | Synthetic only. |
| Instacart Market Basket (Kaggle) | 3M orders, 50k products, aisles, reorders | Download | Realistic shopper history. |
| Dunnhumby Complete Journey | 2 yrs, 2,500 households, prices paid | Download / R package | If prices paid are needed. |

## 3. Delivery / maps

| Provider | Real today? | Notes |
|---|---|---|
| **DoorDash Drive** | ✅ self-serve sandbox (~15–30 min) | JWT (HS256, `dd-ver: DD-JWT-V1`). `POST /drive/v2/quotes` → fee (cents) + pickup/dropoff ETA; accept within 5 min; Delivery Simulator advances states. |
| **Uber Direct** | ✅ self-serve test mode (likely) | OAuth client-credentials, scope `eats.deliveries`; `POST /v1/customers/{id}/delivery_quotes`; Robo Courier `test_specifications.robo_courier_specification.mode="auto"` advances every ~30 s. |
| Google Maps Routes / Route Matrix | ✅ free caps (billing account) | Traffic-aware ETA for simulated couriers. |
| Open-Meteo / OSRM / Nominatim / OpenRouteService | ✅ no/free key | Weather (cold chain, rain), keyless routing/geocoding. |
| Shippo / EasyPost / ShipEngine | ✅ test keys | Parcel (next-day, non-perishable) only. |
| Nash (80+ couriers aggregator) | ❓ sandbox exists, signup unclear | Best on paper; email support@usenash.com as a long shot. |
| Burq, Shipday, Deliverect, Onfleet, Roadie, GoShare, Lalamove, Instacart Connect | ✗ sales/partner-gated or wrong fit | Skip today. |

Realistic courier comparison: **2 real sandbox quotes (DoorDash, Uber) + 2–3 simulated couriers** priced from route duration/distance, normalised to `{provider, fee_cents, dropoff_eta, cold_chain, reliability, source: real|simulated}`.

## 4. Agentic commerce protocols / payments

| Protocol | Demoable today | How |
|---|---|---|
| **Web Bot Auth** (Cloudflare, IETF draft) | ✅ | Verify `Signature-Input` / `Signature` / `Signature-Agent` headers (Ed25519, JWKS at `/.well-known/http-message-signatures-directory`); npm `web-bot-auth`. "Real buyer agent or bad bot?" — Amazon blocked Meta Muse (Sep 21) for not identifying itself. |
| **ACP** (OpenAI + Stripe, open spec, beta) | ✅ merchant side | Implement `checkout_sessions` endpoints from the spec repo; a scripted shopper agent calls them. Live ChatGPT listing needs approval. |
| **Stripe Shared Payment Tokens** | ✅ test mode | `POST /v1/test_helpers/shared_payment/granted_tokens` (usage limits: max amount, expiry) → `POST /v1/payment_intents` with `shared_payment_granted_token`. |
| **UCP** (Google + Shopify) | ✅ | `/.well-known/ucp` + checkout endpoints; samples + conformance repos; Shopify UCP MCP above. |
| AP2 (Google → FIDO) | ⚠️ heavy | Borrow the idea: signed intent mandate (budget cap, categories). |
| A2A v1.0 | ✅ cheap | Publish `/.well-known/agent-card.json`. |
| x402 (Coinbase) | ✅ testnet | Pay-per-call API for bots; weak grocery fit. |
| Visa TAP / Mastercard Agent Pay / PayPal Agent Ready | ⚠️ partial | Signature logic only; payment sides gated. |

## 5. Sponsor-provided assets

- **ZooData:** the only real commerce data from a sponsor — Amazon + TikTok Shop (products, price history, reviews, competitors), 1,000 free credits, MCP with `?api-key=`. No grocery.
- **ZooWork quickstarts** (`SerendipityOneInc/zoowork-platform-quickstarts`): Customer Support (orders/shipments/tickets) and Product Advisor (remote MCP catalog) apps to fork.
- **Moss:** `usemoss/GALLERYHACKS` is **not public (404)** — ask the Moss table. `usemoss/moss` examples include a product catalog, return/shipping policies, FAQ, 1k captioned images; HuggingFace data connector. Free tier: 3 indexes, 50 MB.
- **Band:** no commerce template; `band-ai/legal-demo` (buyer ↔ seller negotiation, 4 frameworks) is the closest to reskin. Judging: the "delete test" + at least one of dependent handoff, mid-conversation agent add, account boundary, or veto.
- **Tavily:** keyless mode (`X-Tavily-Access-Mode: keyless`) or 8k credits. Search snippets show Safeway prices (cached); `/extract` fails on Safeway pages.
- **Novita:** OpenAI-compatible `https://api.novita.ai/openai` — 121 models (Kimi, DeepSeek, GLM, Qwen3-VL, PaddleOCR-VL), `bge-m3` embeddings, Qwen-Image. No hackathon code found — ask.
- **Entire:** `entireio/entire-judge` scores submissions from captured sessions (authenticity after kickoff, prompting, plan/execution, consistency). **Run `entire enable` early** and build in fresh sessions.
