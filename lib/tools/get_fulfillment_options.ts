import { allStores } from './catalog-source'
import type { Store, ToolDefinition } from './types'

export type GetFulfillmentOptionsInput = { zip?: string }

export type GetFulfillmentOptionsOutput = {
  pickup: Array<Store & { pickup_slots: string[] }>
  delivery: { provider: 'instacart'; note: string }
  timezone: string
}

const TZ = 'America/Los_Angeles'
const OPEN_HOUR = 9
const LAST_SLOT_HOUR = 21

function laNow(): { date: Date; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return { date: new Date(), minutes: hour * 60 + minute }
}

function label(dayOffset: number, minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hh = ((h + 11) % 12) + 1
  const time = `${hh}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return `${dayOffset === 0 ? 'Today' : 'Tomorrow'} ${time}`
}

// Four 30-minute pickup slots, starting at least an hour out, within store hours.
function pickupSlots(offset: number): string[] {
  const { minutes } = laNow()
  let start = Math.ceil((minutes + 60) / 30) * 30 + offset * 30
  let day = 0
  if (start > LAST_SLOT_HOUR * 60) {
    day = 1
    start = OPEN_HOUR * 60 + offset * 30
  }
  start = Math.max(start, OPEN_HOUR * 60)
  const slots: string[] = []
  for (let t = start; slots.length < 4 && t <= LAST_SLOT_HOUR * 60; t += 30) slots.push(label(day, t))
  return slots
}

export async function getFulfillmentOptions(input: GetFulfillmentOptionsInput): Promise<GetFulfillmentOptionsOutput> {
  const stores = [...allStores()].sort((a, b) => Number(b.zip === input.zip) - Number(a.zip === input.zip))
  return {
    pickup: stores.map((s, i) => ({ ...s, pickup_slots: pickupSlots(i % 2) })),
    delivery: {
      provider: 'instacart',
      note: 'Home delivery goes through Instacart: the shopper gets a pre-filled list, picks Safeway, and chooses the delivery window and pays there.',
    },
    timezone: TZ,
  }
}

export const getFulfillmentOptionsTool: ToolDefinition<GetFulfillmentOptionsInput, GetFulfillmentOptionsOutput> = {
  name: 'get_fulfillment_options',
  description:
    'Get the ways the shopper can receive the order: store pickup (Safeway stores with their next pickup ' +
    'slots) and home delivery (via Instacart). Call it before offering pickup times or a store. Pass the ' +
    'shopper\'s zip to list the closest store first.',
  input_schema: {
    type: 'object',
    properties: { zip: { type: 'string', description: 'US zip code, e.g. "94114".' } },
  },
  run: getFulfillmentOptions,
}
