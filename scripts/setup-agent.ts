// Create (or update) the Basket agent on ZooWork, start it, and save its id to .env.local.
// Safe to re-run after editing lib/zoowork/agent-config.ts.
//   npm run agent:setup                 # pick a model automatically
//   ZOOWORK_MODEL=<alias> npm run agent:setup
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { AGENT_LABELS, AGENT_NAME, agentResource } from '../lib/zoowork/agent-config'
import { zoowork } from '../lib/zoowork/client'

// Strong tool-callers first; the first selectable match wins.
const MODEL_PREFERENCES = [/claude.*sonnet/i, /claude.*opus/i, /gpt-5/i, /claude/i, /gemini.*pro/i]

const zc = zoowork()

async function pickModel(): Promise<string | undefined> {
  const models = (await zc.listModels()).filter((m) => m.selectable !== false)
  console.log(`Models available: ${models.map((m) => m.model).join(', ')}`)
  if (process.env.ZOOWORK_MODEL) {
    if (!models.some((m) => m.model === process.env.ZOOWORK_MODEL)) throw new Error(`ZOOWORK_MODEL ${process.env.ZOOWORK_MODEL} is not selectable`)
    return process.env.ZOOWORK_MODEL
  }
  for (const pattern of MODEL_PREFERENCES) {
    const hit = models.find((m) => pattern.test(m.model))
    if (hit) return hit.model
  }
  return models.find((m) => (m as { default_for?: string[] }).default_for?.includes('model'))?.model
}

async function findExisting(): Promise<string | undefined> {
  if (process.env.ZOOWORK_AGENT_ID) return process.env.ZOOWORK_AGENT_ID
  for await (const agent of zc.listAgents({ labels: AGENT_LABELS })) {
    if (agent.declared?.name === AGENT_NAME || (agent as { name?: string }).name === AGENT_NAME) return agent.agent_id
  }
  return undefined
}

function saveEnv(key: string, value: string) {
  const path = '.env.local'
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter((l) => !l.startsWith(`${key}=`)) : []
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  lines.push(`${key}=${value}`, '')
  writeFileSync(path, lines.join('\n'))
}

const model = await pickModel()
console.log(`Using model: ${model ?? '(platform default)'}`)
const resource = agentResource(model)

let id = await findExisting()
if (id) {
  const sections: Partial<typeof resource> = { ...resource }
  delete sections.name // name is fixed at create
  await zc.updateAgent(id, sections)
  console.log(`Updated agent ${id}`)
} else {
  const created = await zc.createAgent({ resource }, `basket-agent-${Date.now()}`)
  id = created.agent_id
  console.log(`Created agent ${id}`)
}

await zc.startAgent(id)
await zc.waitUntilRunning(id, { timeoutMs: 60_000 })
saveEnv('ZOOWORK_AGENT_ID', id)

const agent = await zc.getAgent(id)
console.log(`Agent ${id} is ${agent.status?.desired_state}; config_version ${agent.status?.config_version ?? agent.config_version}`)
console.log(`Custom tools: ${resource.custom_tools.map((t) => t.name).join(', ')}`)
console.log('Saved ZOOWORK_AGENT_ID to .env.local. Next: npm run agent:smoke')
