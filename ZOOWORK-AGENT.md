# ZooWork agent (owner 1)

The ZooWork agent is Basket's brain behind the voice. GPT-Live does the talking. When the shopper
wants something, the frontend calls `POST /api/delegate`. With ZooWork configured, that runs a ZooWork
turn. The agent changes the order on screen through custom tools and answers with one sentence for the
voice to say.

```
voice (GPT-Live) ─► POST /api/delegate { transcript, order }
                     └► lib/agent.ts runAgentTurn
                          ├─ ZOOWORK_API_KEY + ZOOWORK_AGENT_ID set → lib/zoowork/delegate.ts (ZooWork)
                          └─ otherwise → interim OpenAI agent (unchanged)
ZooWork turn: system.message (profile + current order) + user.message (newest shopper words)
   ⇄ agent.custom_tool_use → lib/agent-tools/* → resolveCustomToolCall
   → { say, order, actions }   (same DelegateOutput the frontend already renders)
```

## Run it

```bash
cp .env.example .env.local      # add ZOOWORK_API_KEY
npm install
npm run agent:setup             # create/update + start the agent, saves ZOOWORK_AGENT_ID to .env.local
npm run agent:smoke             # live: pickup, profile, delivery flows through the /api/delegate path
npm run agent:chat              # talk to it in the terminal (demo fallback), prints the order after each turn
npm run dev                     # the app; /api/delegate now uses ZooWork
```

On Vercel, set `ZOOWORK_API_KEY` and `ZOOWORK_AGENT_ID` to switch the live site to ZooWork. Remove them to go back to the interim agent.
Re-run `agent:setup` after editing `lib/zoowork/agent-config.ts`.

## Agent tools (`lib/agent-tools/`)

| Tool | What it does |
|---|---|
| `search_catalog` | Searches `lib/demo-catalog.ts`, the same ids the screen renders. Profile allergens and diet are applied automatically, and removed matches are listed in `hidden_by_profile`. With `substitute_for` it uses `findSubstitutes`. |
| `add_item` `remove_item` `set_qty` `propose_swap` `swap_item` `dismiss_swap` `set_fulfillment` | One per `OrderAction`, applied with `applyAction` from `lib/order.ts`. The actions are returned to the frontend. `add_item` and `swap_item` refuse products the profile blocks. The swap tools log out-of-stock events automatically. |
| `checkout` | Places the order the screen shows. Pickup: a pickup order with slot and 4-digit code, shown in `fulfillment.eta` and listed at `GET /api/orders`. Delivery: an Instacart shopping-list link in `fulfillment.checkout_url`, which the checkout button opens. Without `INSTACART_API_KEY` it links to Safeway's Instacart storefront. |
| `update_profile` | Saves lasting facts the shopper mentions: allergens, diet, brands, dislikes, pickup or delivery. Removing an allergen needs the shopper's confirmation. |

When data-search merges, point `search_catalog` at `lib/catalog` (Moss). The output shape stays the same.

## Household profile (`lib/profile/`)

All of this happens automatically:

- **Stored** in our backend: `data/profiles.json` (git-ignored), or `/tmp` on Vercel. The seed is Sam: milk + peanut allergies, prefers pickup.
  - `GET /api/profile` reads it.
  - `PUT /api/profile` with fields edits it.
  - `POST /api/profile {"reset":true}` restores the seed.
- **Injected** into each ZooWork session as a `system.message`, and re-sent when it changes.
- **Learned** through `update_profile`.
- **Enforced** in the tools, so a blocked product can't reach the order even if the model forgets.

## Demo script (works with the 18-product demo catalog)

1. *"Pasta night for four tonight, I'll pick it up"*: penne, marinara, basil, garlic. The parmesan is skipped because of the milk allergy, and the agent says so.
2. *"Add oat milk"*: Oatly is out, so the swap card shows O Organics first. *"Yes"* swaps it.
3. *"That's all, place it"*: pickup time and code.
4. *"My daughter can't have wheat"*: the profile updates live, and pasta and bread are blocked from then on.
5. Delivery: *"Send it to Instacart"*. The checkout button opens the Instacart list.

Before the demo: run `npm run agent:smoke`, which also resets the profile. Keep `npm run agent:chat` open as a fallback.

## Notes

- One ZooWork session per voice conversation, keyed by the first transcript line. Sessions are kept in memory: a new server instance starts a fresh session and gets the recent transcript as context.
- `maxDuration = 60` on `/api/delegate`, because a turn with several tool calls takes 10–30 s.
- Explainer page: https://claude.ai/artifact/TqNTpfvhrVNXMLRDFNeoHh
