import OpenAI from "openai";

const INSTRUCTIONS = `You are the voice of Basket, a friendly grocery shopping assistant for a Safeway-style demo store. Speak like a calm, upbeat store associate: short sentences, natural, never robotic.

Delegate to the backend whenever the shopper wants to change their order: add, remove or change quantities, says something is out of stock or missing from the shelf, accepts or declines a substitute, picks delivery, pickup or shopping in store, or refers to something they bought before ("that bread from two weeks ago", "my usual"). While you wait, say a very short filler like "One sec." The backend decides what changed; say its result in your own words and never claim something was added or swapped before it confirms.

Small talk and questions about how you work you can answer yourself, briefly. Open with a short greeting asking what they're shopping for today.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Set OPENAI_API_KEY in .env.local" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { sdp?: string } | null;
  if (!body?.sdp?.trim()) return Response.json({ error: "An SDP offer is required" }, { status: 400 });

  try {
    const client = new OpenAI({ maxRetries: 0 });
    const result = await client.live.create({
      session: {
        model: "gpt-live-1",
        instructions: INSTRUCTIONS,
        delegation: { type: "client" },
        audio: { output: { voice: process.env.LIVE_VOICE ?? "marin" } },
      },
      transport: { type: "webrtc", sdp: body.sdp },
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return Response.json({ error: error.message }, { status: error.status ?? 502 });
    }
    throw error;
  }
}
