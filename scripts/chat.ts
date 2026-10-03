// Talk to the live ZooWork agent from the terminal, through the same path as /api/delegate.
//   npm run agent:chat
import { createInterface } from "node:readline/promises";
import { emptyOrder } from "../lib/order";
import type { DelegateOutput, OrderState, TranscriptLine } from "../lib/types";
import { zooworkDelegate } from "../lib/zoowork/delegate";
import type { TurnEvent } from "../lib/zoowork/turn";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

export function printEvent(ev: TurnEvent) {
  if (ev.type === "session") console.log(dim(`[zoowork session ${ev.sessionId}]`));
  if (ev.type === "tool" && ev.phase === "start") console.log(dim(`  → ${ev.name} ${JSON.stringify(ev.input)}`));
  if (ev.type === "tool" && ev.phase === "end") console.log(dim(`  ← ${ev.name} ${ev.ok ? "ok" : "ERROR"} (${ev.ms} ms) ${JSON.stringify(ev.output).slice(0, 140)}`));
  if (ev.type === "profile") console.log(cyan(`  ♥ profile v${ev.profile.version}: allergens=${ev.profile.allergens.join(",") || "-"} diet=${ev.profile.diet.join(",") || "-"}`));
  if (ev.type === "done") console.log(dim(`[turn ${ev.status}${ev.error ? `: ${ev.error}` : ""}]`));
}

export function printResult(out: DelegateOutput) {
  console.log(green(`Basket: ${out.say}`));
  const items = out.order.items.map((i) => `${i.product.name} ×${i.qty}${i.status !== "added" ? ` [${i.status}]` : ""}`).join(", ") || "(empty)";
  const f = out.order.fulfillment;
  console.log(cyan(`  order: ${items} · $${out.order.subtotal.toFixed(2)} · ${f.mode}${f.eta ? ` · ${f.eta}` : ""}${f.checkout_url ? ` · ${f.checkout_url}` : ""}`));
  if (out.order.pending) console.log(cyan(`  swap card: ${out.order.pending.missing.name} → ${out.order.pending.options.map((o) => o.product.name).join(" / ")}`));
}

// A conversation the way the frontend holds it: transcript + order, sent on every delegation.
export async function say(convo: { transcript: TranscriptLine[]; order: OrderState }, text: string) {
  convo.transcript.push({ role: "user", text, at: Date.now() });
  const out = await zooworkDelegate(
    { delegation_id: `cli-${Date.now()}`, transcript: convo.transcript, order: convo.order },
    { onEvent: printEvent },
  );
  convo.order = out.order;
  convo.transcript.push({ role: "assistant", text: out.say, at: Date.now() });
  printResult(out);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let convo = { transcript: [] as TranscriptLine[], order: emptyOrder() };
  console.log(dim('Talk to Basket (empty line or Ctrl+C quits, "/new" starts over).'));
  while (true) {
    const text = (await rl.question("You: ")).trim();
    if (!text) break;
    if (text === "/new") {
      convo = { transcript: [], order: emptyOrder() };
      continue;
    }
    await say(convo, text);
  }
  rl.close();
}
