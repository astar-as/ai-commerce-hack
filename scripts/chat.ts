// Talk to the live agent from the terminal: type what the voice layer would send.
//   npm run agent:chat
import { createInterface } from 'node:readline/promises'
import { DEMO_PROFILE_ID } from '../lib/profile/store'
import { runTurn, type TurnEvent } from '../lib/zoowork/turn'

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`

export function printEvent(ev: TurnEvent) {
  switch (ev.type) {
    case 'session':
      console.log(dim(`[session ${ev.sessionId}]`))
      break
    case 'assistant':
      console.log(green(`Basket: ${ev.text}`))
      break
    case 'tool':
      if (ev.phase === 'start') console.log(dim(`  → ${ev.name} ${JSON.stringify(ev.input)}`))
      else console.log(dim(`  ← ${ev.name} ${ev.ok ? 'ok' : 'ERROR'} (${ev.ms} ms) ${JSON.stringify(ev.output).slice(0, 160)}`))
      break
    case 'profile':
      console.log(cyan(`  ♥ PROFILE v${ev.profile.version}: allergens=${ev.profile.allergens.join(',') || '-'} diet=${ev.profile.diet.join(',') || '-'} brands=${ev.profile.brand_preferences.join('; ') || '-'}`))
      break
    case 'order':
      console.log(cyan(`  ★ ${ev.kind.toUpperCase()} ORDER ${JSON.stringify(ev.order)}`))
      break
    case 'done':
      console.log(dim(`[turn ${ev.status}${ev.error ? `: ${ev.error}` : ''}]`))
      break
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let sessionId: string | undefined
  console.log(dim('Say something to Basket (empty line or Ctrl+C to quit). "/new" starts a new session.'))
  while (true) {
    const text = (await rl.question('You: ')).trim()
    if (!text) break
    if (text === '/new') {
      sessionId = undefined
      continue
    }
    for await (const ev of runTurn({ text, sessionId, actorRef: DEMO_PROFILE_ID })) {
      if (ev.type === 'session') sessionId = ev.sessionId
      printEvent(ev)
    }
  }
  rl.close()
}
