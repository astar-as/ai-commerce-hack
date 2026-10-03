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
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const beat = setInterval(() => controller.enqueue(encoder.encode(" ")), 2000);
      let body: unknown;
      try {
        const turn = await runAgentTurn(input);
        body = { ...turn, order: await withCheckoutUrl(turn.order, origin) };
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ evt: "delegate_error", engine, ms: Date.now() - started, heard, error: message }));
        body = { say: "Sorry, I lost my train of thought there. Could you say that again?", order: input.order, actions: [], error: message };
      } finally {
        clearInterval(beat);
      }
      controller.enqueue(encoder.encode(JSON.stringify(body)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
