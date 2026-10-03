import { createZooworkClient, type ZooworkClient } from '@zoowork-ai/sdk'

let client: ZooworkClient | undefined

// Server-side only: the API key must never reach the browser.
export function zoowork(): ZooworkClient {
  return (client ??= createZooworkClient({ apiKey: process.env.ZOOWORK_API_KEY }))
}

export function agentId(): string {
  const id = process.env.ZOOWORK_AGENT_ID
  if (!id) throw new Error('ZOOWORK_AGENT_ID is not set. Run `npm run agent:setup` first.')
  return id
}
