import { runAgentTurn } from "@/lib/agent";
import { withCheckoutUrl } from "@/lib/tools/send_to_instacart";
import type { DelegateInput } from "@/lib/types";
import { zooworkEnabled } from "@/lib/zoowork/delegate";

// A ZooWork turn with a few tool calls can take 10–30 s.
export const maxDuration = 60;

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as DelegateInput | null;
  if (!input?.order || !Array.isArray(input.transcript)) {
    return Response.json({ error: { code: "invalid_input", message: "order and transcript are required" } }, { status: 400 });
  }
  const started = Date.now();
  const heard = [...input.transcript].reverse().find((l) => l.role === "user")?.text.slice(0, 160);
  const engine = zooworkEnabled() ? "zoowork" : "interim";
  try {
    const turn = await runAgentTurn(input);
    console.log(
      JSON.stringify({
        evt: "delegate",
        engine,
        ms: Date.now() - started,
        heard,
        say: turn.say.slice(0, 200),
        actions: turn.actions.map((a) => ("product_id" in a ? `${a.type}:${a.product_id}` : a.type)),
        items: turn.order.items.length,
      }),
    );
    return Response.json({ ...turn, order: await withCheckoutUrl(turn.order, new URL(request.url).origin) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ evt: "delegate_error", engine, ms: Date.now() - started, heard, error: message }));
    return Response.json(
      { say: "Sorry, I lost my train of thought there. Could you say that again?", order: input.order, actions: [], error: message },
      { status: 200 },
    );
  }
}
