# ZooWork agent — voice to home delivery or store pickup

The agent takes what the shopper said (a transcript), builds a Safeway basket, asks
**delivery or pickup**, confirms once, and places it:

- **Pickup** → `create_pickup_order` creates an order at the chosen Safeway with a slot and a 4-digit pickup code. It shows up in `GET /api/orders`, for the store screen.
- **Delivery** → `send_to_instacart` returns a pre-filled Instacart list. The shopper picks Safeway, a delivery window and pays there. Without `INSTACART_API_KEY` it returns a mock link.

## Run it

```bash
cp .env.example .env.local      # add ZOOWORK_API_KEY
npm install
npm run agent:setup             # creates/updates + starts the agent, saves ZOOWORK_AGENT_ID
npm run agent:smoke             # runs the pickup + delivery flows live, checks tools fired
npm run agent:chat              # talk to it in the terminal (demo fallback)
npm run dev                     # API on http://localhost:3000
```

Re-run `agent:setup` after editing `lib/zoowork/agent-config.ts` (persona or tools).

## API for the voice / frontend layer

`POST /api/agent` with `{ "text": "<transcript>", "sessionId": "<from the previous turn, optional>" }`
returns `text/event-stream`. Each `data:` line is one JSON event:

| `type` | Fields | What to do |
|---|---|---|
| `session` | `sessionId` | Keep it and send it with the next utterance. Only sent on the first turn. |
| `assistant` | `text` | Show it and speak it (TTS). Can arrive more than once per turn. |
| `tool` | `phase` (`start`/`end`), `name`, `input` / `output`, `ok`, `ms` | Optional progress, e.g. "Checking Market St stock…". |
| `order` | `kind` (`pickup`/`delivery`), `order` | Pickup: card with store, slot, `pickup_code`, `total`. Delivery: button to `order.url`. |
| `profile` | `profile` | The agent saved something ("my son is allergic to eggs"). Refresh the profile view, e.g. a "Saved: eggs" toast. |
| `done` | `status` (`succeeded`/`failed`/`aborted`), `error?` | Turn over: start listening again. |

Example:

```js
const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, sessionId }) })
const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
let buf = ''
for (;;) {
  const { value, done } = await reader.read(); if (done) break
  buf += value
  let i
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 2)
    if (line.startsWith('data: ')) handle(JSON.parse(line.slice(6)))
  }
}
```

Other routes:
- `GET /api/profile` returns the household profile. `PUT /api/profile` with any of `allergens`, `diet`, `brand_preferences`, `dislikes`, `zip`, `usual_store_id`, `fulfillment_preference`, `budget_weekly`, `notes`, `name`, `household_size` edits it from the app. `POST /api/profile {"reset":true}` restores the demo seed.
- `POST /api/agent/interrupt` with `{ sessionId }` stops the agent mid-turn (barge-in).
- `POST /api/tools/<name>` calls a tool directly, with no LLM. Same JSON in and out as the agent gets.
- `GET /api/orders?store_id=safeway-sf-01` lists the pickup orders for the store screen.

One turn at a time per session. Send the next utterance after `done`, or interrupt first.

## How it fits together

```
transcript ─► POST /api/agent ─► lib/zoowork/turn.ts ─► ZooWork session (agent "basket-safeway")
                                     ▲        │ agent.custom_tool_use (requested)
                                     │        ▼
                                     │   lib/tools/* (search_catalog, check_stock, get_fulfillment_options,
                                     │                create_pickup_order, send_to_instacart, report_oos)
                                     └── resolveCustomToolCall ◄┘
```

- **Persona** (`lib/zoowork/agent-config.ts`): `AGENTS.md` sets a voice style (short spoken replies, no URLs), the order flow, "never place without an explicit yes", and "save lasting facts with update_profile right away".
- **Household profile** (`lib/profile/`), all automatic:
  - It's stored in our backend (`data/profiles.json`, git-ignored). The seed is Sam: 94114, Market St, milk + peanut allergies, prefers pickup.
  - It's injected into every ZooWork session as a `system.message`, and re-sent if it changes between turns (for example after an edit in the app). The shopper never repeats it.
  - It's learned from conversation: the agent calls `update_profile` as soon as the shopper mentions an allergy, diet, brand or store. Removing an allergen requires the shopper to confirm.
  - It's enforced server-side in the tools: `search_catalog` hides products that break allergens or diet and reports them in `profile_filters.hidden`. `create_pickup_order` and `send_to_instacart` refuse them. This holds even if the model forgets.
- **Data**: `mocks/catalog.ts` holds 52 products and 3 SF stores, with demo out-of-stocks (Oatly Barista is out at Market St). Person 2 swaps `lib/tools/catalog-source.ts` and `search_catalog` for the real catalog plus Moss. The tool's input and output don't change.
- **State** (orders, OOS events, stream cursors) is in memory. Restarting the server clears it.

## Live demo checklist

1. 15 min before: `npm run agent:setup` (agent running) and `npm run agent:smoke` (profile, pickup, delivery ✓; it resets the profile afterwards).
2. Keep `npm run agent:chat` open in a terminal as the fallback if voice or the network to the UI fails.
3. Script: *"Taco night for four tonight, I'll pick it up at Market Street after work"* → basket with dairy-free cheese, because the profile says milk allergy and the shopper never mentioned it → *"yes"* → pickup code, and the order appears on the store screen. Then *"My son is allergic to eggs now"* → the profile updates live, and eggs vanish from results. Then *"Get me oat milk, bananas, eggs and spinach delivered"* → *"yes"* → Instacart button.
