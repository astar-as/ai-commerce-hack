// /api/delegate on ZooWork: GPT-Live hands the shopper's request to the ZooWork agent, which
// changes the order through custom tools and answers with one sentence for the voice to say.
import { orderSummary } from "@/lib/agent-tools/order_tools";
import type { ToolContext } from "@/lib/agent-tools/types";
import { DEMO_PROFILE_ID, getProfile } from "@/lib/profile/store";
import type { DelegateInput, DelegateOutput, TranscriptLine } from "@/lib/types";
import { runTurn, type TurnEvent } from "./turn";

export const zooworkEnabled = () => Boolean(process.env.ZOOWORK_API_KEY && process.env.ZOOWORK_AGENT_ID);

// One ZooWork session per voice conversation, keyed by the conversation's first transcript line.
// In memory: a new server instance just starts a fresh session with the recent transcript as context.
const g = globalThis as typeof globalThis & { __basketVoiceSessions?: Map<string, string> };
const sessions = (g.__basketVoiceSessions ??= new Map<string, string>());

function conversationKey(transcript: TranscriptLine[]): string {
  const first = transcript[0];
  return first ? `${first.at}:${first.role}` : "no-transcript";
}

// What the shopper said since the voice last spoke.
function newestShopperText(transcript: TranscriptLine[]): string {
  const lastVoice = transcript.map((l) => l.role).lastIndexOf("assistant");
  const fresh = transcript.slice(lastVoice + 1).filter((l) => l.role === "user").map((l) => l.text.trim()).filter(Boolean);
  if (fresh.length) return fresh.join(" ");
  return [...transcript].reverse().find((l) => l.role === "user")?.text.trim() ?? "";
}

export type DelegateOptions = { actorRef?: string; onEvent?: (ev: TurnEvent) => void; signal?: AbortSignal };

export async function zooworkDelegate(input: DelegateInput, opts: DelegateOptions = {}): Promise<DelegateOutput> {
  const actorRef = opts.actorRef ?? DEMO_PROFILE_ID;
  const text = newestShopperText(input.transcript);
  if (!text) return { say: "What would you like to get today?", order: input.order, actions: [] };

  const key = conversationKey(input.transcript);
  const sessionId = sessions.get(key);
  const ctx: ToolContext = { profile: getProfile(actorRef), order: input.order, actions: [] };

  const notes = [
    `Current order on the shopper's screen (source of truth; it may have been changed by tapping):\n${JSON.stringify(orderSummary(input.order))}`,
  ];
  if (!sessionId && input.transcript.length > 1) {
    const recent = input.transcript.slice(-10, -1).map((l) => `${l.role === "user" ? "Shopper" : "Voice"}: ${l.text}`).join("\n");
    notes.push(`Conversation so far (spoken through the voice assistant):\n${recent}`);
  }

  const said: string[] = [];
  let failure: string | undefined;
  for await (const ev of runTurn({ text, notes, sessionId, actorRef, ctx, signal: opts.signal })) {
    opts.onEvent?.(ev);
    if (ev.type === "session") sessions.set(key, ev.sessionId);
    if (ev.type === "assistant") said.push(ev.text.trim());
    if (ev.type === "done" && ev.status !== "succeeded") failure = ev.error || ev.status;
  }

  // Order changes already made still count, even if the turn failed afterwards.
  if (failure && !said.length) throw new Error(`ZooWork turn ${failure}`);
  const say = said.filter(Boolean).at(-1) ?? "Done.";
  return { say, order: ctx.order, actions: ctx.actions };
}
