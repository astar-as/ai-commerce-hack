// Pre-demo check: runs the demo flows against the live agent and checks the tools fired.
//   npm run agent:smoke            # profile + pickup + delivery
//   npm run agent:smoke pickup     # just one flow
// Resets the demo profile before and after, so the live run starts clean.
import { DEMO_PROFILE_ID, getProfile, resetProfile } from '../lib/profile/store'
import { state } from '../lib/store/memory'
import { runTurn } from '../lib/zoowork/turn'
import { printEvent } from './chat'

type Flow = { name: string; turns: string[]; mustCall: string[]; check?: () => string | undefined }

const FLOWS: Flow[] = [
  {
    name: 'profile',
    turns: ["Quick thing: my son just found out he's allergic to eggs. Can you add some breakfast stuff for the week?"],
    mustCall: ['update_profile', 'search_catalog'],
    check: () => (getProfile(DEMO_PROFILE_ID)?.allergens.includes('eggs') ? undefined : 'eggs not saved as allergen'),
  },
  {
    name: 'pickup',
    turns: [
      "Hey, I need stuff for taco night for four tonight. I'll pick it up at the Market Street Safeway after work.",
      'Yes, the first slot works. Go ahead and place it.',
    ],
    mustCall: ['search_catalog', 'create_pickup_order'],
  },
  {
    name: 'delivery',
    turns: [
      'Can you get me oat milk, bananas, eggs and spinach delivered to my home?',
      'Yes, send it.',
    ],
    mustCall: ['search_catalog', 'send_to_instacart'],
  },
]

const only = process.argv[2]
let failed = false
resetProfile(DEMO_PROFILE_ID) // start every smoke run from the demo seed

for (const flow of FLOWS.filter((f) => !only || f.name === only)) {
  console.log(`\n=== ${flow.name} ===`)
  const called = new Set<string>()
  let sessionId: string | undefined
  const started = Date.now()

  for (const text of flow.turns) {
    console.log(`You: ${text}`)
    for await (const ev of runTurn({ text, sessionId, actorRef: DEMO_PROFILE_ID })) {
      if (ev.type === 'session') sessionId = ev.sessionId
      if (ev.type === 'tool' && ev.phase === 'end' && ev.ok) called.add(ev.name)
      printEvent(ev)
    }
  }

  const missing: string[] = flow.mustCall.filter((t) => !called.has(t))
  const problem = flow.check?.()
  if (problem) missing.push(problem)
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  if (missing.length) {
    failed = true
    console.log(`✗ ${flow.name}: missing ${missing.join(', ')} (${secs}s)`)
  } else {
    console.log(`✓ ${flow.name}: ${[...called].join(', ')} (${secs}s)`)
  }
}

resetProfile(DEMO_PROFILE_ID) // leave the demo profile clean for the live run
console.log(`\nOrders recorded: ${state.orders.map((o) => `${o.kind}:${o.order_id}`).join(', ') || 'none'}`)
process.exit(failed ? 1 : 0)
