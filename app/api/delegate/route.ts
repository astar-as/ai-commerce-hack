import { runAgentTurn } from "@/lib/agent";
import { withCheckoutUrl } from "@/lib/tools/send_to_instacart";
import type { DelegateInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as DelegateInput | null;
  if (!input?.order || !Array.isArray(input.transcript)) {
    return Response.json({ error: { code: "invalid_input", message: "order and transcript are required" } }, { status: 400 });
  }
  try {
    const turn = await runAgentTurn(input);
    return Response.json({ ...turn, order: await withCheckoutUrl(turn.order, new URL(request.url).origin) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { say: "Sorry, I lost my train of thought there. Could you say that again?", order: input.order, actions: [], error: message },
      { status: 200 },
    );
  }
}
