# The AI Commerce Gallery — Hackathon Context

Saturday **October 3rd, 2026** · The Walt Disney Family Museum, San Francisco
Hosted by **ZooWork** × **AI Valley** · Sources: opening-ceremony deck, [event page](https://www.aivalley.io/events/6bbloggr)

> ⏰ **Submission deadline: 5:00 PM PST** — [submit here](https://www.aivalley.io/events/6bbloggr)

---

## Quick reference

| What | Value |
|---|---|
| Wifi | `WDFMuseum` |
| Organizer comms | AI Valley Discord — `#❓︱event-questions`, `#❓︱faq-and-resource`, `#👥︱team-formation`, `#💬︱event-general`, `#📣︱hackathon-announcements` |
| ZooWork credits | `PFDQ5YJ3` — $200 (see redemption steps below) |
| Tavily credits | `GALLERYHACK` — 8,000 free credits, valid Oct 3–4, 2026 (limited) |
| Band Pro | `BANDSEP26` — free 3-month Pro tier |
| ZooWork API key | platform.zoowork.ai → API keys → Create (shown once) → set `ZOOWORK_API_KEY` |
| Mentors | Any ZooWork team member (their FDE team is on site all day) |

---

## Schedule

### Daytime — Diane Disney Miller Exhibition Hall

| Time | What |
|---|---|
| 9:00 AM | **Registration & Breakfast** — check-in, meet fellow builders |
| 10:00 AM | **Opening & Sponsor Talks** — welcome, challenge briefing, partner/tool intros |
| 11:00 AM | **Workshops & Hacking** — technical workshops, partner resources, mentor support |
| 12:30 PM | **Lunch + Continued Hacking** |
| 4:00 PM | **Progress Review** — final team check-ins, product feedback, mentor support |
| **5:00 PM** | **Project Submission Deadline** |
| 5:00 PM | **Dinner & Presentation Prep** (Exhibition Hall) |

### Evening — The Walt Disney Family Museum

| Time | What |
|---|---|
| 6:00 PM | Exhibition Hall closes → move to the Main Museum's **Theater** |
| 6:00–7:30 PM | **From Code to Magic: Project Presentations & Judging** — 10 presenters on stage |
| 7:30 PM | **Awards & Reception** 🏆 |
| 7:30–9:00 PM | **Private Main Galleries Access** 🏰 |
| 9:00 PM | Event closing |

> ⚠️ The opening deck shows a slightly different evening flow: **5:30 PM gallery walk** (judges visit every team's live exhibit station), **6:15 PM** featured presentations (top 5–8 teams), **7:00 PM** awards. Have the demo runnable at your station from 5:30 either way, and confirm on `#📣︱hackathon-announcements`.

---

## Prizes

| Prize | Reward |
|---|---|
| 🥇 Grand Prize — 1st | $1,000 |
| 🥈 2nd | $500 |
| 🥉 3rd | $250 |
| Best Use of **ZooWork** | $800 |
| Best Use of **Band** | $500 |
| Best Use of **Entire** | LEGO Disney·Pixar *Toy Story* Slinky Dog set |
| People's Choice | Logitech MX Creative Console |

Bonus: upvote + comment on ZooWork's Product Hunt launch (producthunt.com/products/zoowork), show the screenshot → gift from the museum.

## Judging criteria

1. **Approach & Idea** — viable, creative, relevant to a real-world problem / business-viable?
2. **Technical Execution** — robust, functional, sophisticated? Primary features work **live**?
3. **Presentation**
4. **Design** — user-friendly and thoughtfully designed?
5. **X-Factor** — does it surprise or delight, stand out?

## The brief (from ZooWork's opening)

- Tracks: e-commerce & storefront · merchant ops, inventory, fulfillment & payments · restaurants, retail, POS & physical commerce · AI agents, MCP & workflow automation.
- "The shopper now has an agent — the merchant needs one too." A merchant's agent earns its keep in one of three ways:
  - **Revenue — sell more** (get found, advise, price, promote, win back)
  - **Efficiency — run leaner** (service, catalog, content, replenishment)
  - **Risk — lose less** (fraud, return abuse, policy checks, bad bots posing as buyer agents)
- *"Pick a real merchant. Pick one line of their P&L. Move it."*
- The bar: **an agent a merchant would pay for, and could run on Monday.**

---

## Sponsors & tools

### ZooWork — agent delivery platform (host)
- **Build** in the no-code Builder, or from Claude Code / Codex / Cursor via the **Managed Agents API** (developer preview).
- **Run**: each agent in its own managed, isolated sandbox — always on.
- **Deliver**: a link, an API, WhatsApp, iMessage, Slack, or a vibe-coded web page (e.g. on Vercel).
- **Commerce data**: ZooData out of the box, plus RAG over a merchant's own files.
- Three API nouns: **Agent** (model, instructions, tools, skills) · **Session** (one conversation, ~one per user/thread) · **Events** (streamed messages, tool activity, replies).
- Built-in LLM, image, video and voice models; connect own APIs or any MCP server. Open-source models sponsored by Novita.
- SDKs: TypeScript `@zoowork-ai/sdk`, Python `zoowork`.

**Setup**
```bash
npx skills add SerendipityOneInc/zoowork-sdk-skills   # needs Node ≥ 22.20
# then ask your coding agent: "Build me a ZooWork agent that…"
# or point it at https://zoowork.ai/docs
```
1. Sign in at platform.zoowork.ai → **API keys → Create API key** → copy immediately → `export ZOOWORK_API_KEY=...`
2. Credits: console sidebar **Add funds** → **Other** → `200` → **Add** → **Add promotion code** `PFDQ5YJ3` → complete checkout.

### Band — agent-to-agent communications platform
- Rooms where agents (from any framework/cloud) and humans collaborate. **@mentions route work** — an agent only acts when addressed; everyone sees everything.
- Coordination model: **Discover** (registry) → **Address** (stable `@handle`) → **Mention** → **Consent** (cross-boundary contact requests both sides approve) → **Explicit** (every call is a replayable, auditable room event).
- Adapters (Python/TS): LangGraph, Anthropic SDK, Claude Agent SDK, Pydantic AI, Codex, OpenCode, CrewAI, Parlant, OpenAI (TS), Vercel AI SDK (TS), Gemini, Google ADK, Letta, Slack — or custom.
- **Band Desktop**: each coding agent (Claude Code, Codex, SDK agent) is a "seat" with an `@handle`; rooms have chat, a shared task board and files.
- Their advice: *"Make Band essential: remove it and coordination breaks."* Use test-mode payments and synthetic customer data; the room log doubles as the audit trail.

```bash
pip install "band-sdk[anthropic]"     # or [langgraph], [claude_sdk], [crewai], ...
npm install @band-ai/sdk
```
```python
from band import Agent
from band.adapters import AnthropicAdapter

adapter = AnthropicAdapter(model="...", prompt="...")
agent = Agent.create(adapter=adapter, agent_id="your-agent-uuid", api_key="your-api-key")
await agent.run()   # connects and runs forever
```
Register agents at app.band.ai → Agents → Remote Agent (save UUID + API key). Free tier: 10 agents.
Resources: [docs.band.ai](https://docs.band.ai) · [hacker guide](https://band.ai/hacker-guide) · [Band Desktop](https://docs.band.ai/band-desktop) · [GitHub](https://github.com/band-ai) · [Discord](https://discord.com/invite/5YkNXmYfjk) · Pro code `BANDSEP26`.

### Entire — "Git tells you what changed. Entire tells you why."
- Attaches the full agent session (prompts, tool calls, output, reasoning) to each commit as a **checkpoint**.
- **Mirrors**: code stays on GitHub; agents clone from a nearby Entire cell (fast, high rate limits).
- **Trails**: durable home for a piece of work = issue + PR in one place (intent, branch, commits, sessions, review). The trail description *is* the spec. States: Planning → Building → review/merge.
- **Runners** (agents/automations on trail commits, configured in `.entire/runners/`) + **Gates** (quality/compliance checks that control mergeability). Starter configs: github.com/entirehq/entire.io/tree/main/.entire/runners
- Resume work anywhere: `entire trail resume <trail-id>` or paste the trail URL to your agent.
- Supports Claude Code, Codex, Cursor and more. Docs: [docs.entire.io](https://docs.entire.io) · @entirehq

### Moss — real-time semantic search
- Sub-10 ms retrieval (vs 200–500 ms cloud round-trips); vector + keyword + hybrid; runs on-device, with optional Moss Cloud sync.
- Built-in `moss-minilm` (32 MB) embeddings for text, image and audio; SDK core <700 KB.
- `pip install moss` · `npm install @moss-js/moss`
- Hackathon repo: [github.com/usemoss/GALLERYHACKS](https://github.com/usemoss/GALLERYHACKS) · [moss.dev](https://moss.dev) · Discord: moss.link/discord

### Tavily (by Nebius) — web access for agents
- Endpoints: `/search`, `/extract`, `/crawl`, `/map`.
- **8,000 free credits** with code `GALLERYHACK` (valid Oct 3–4, 2026, limited).

### Novita AI — AI infrastructure
- Model access through a single API + GPU compute; sponsors the open-source models inside ZooWork.

### AI Valley — community organizer / co-host
- [aivalley.io](https://aivalley.io)
