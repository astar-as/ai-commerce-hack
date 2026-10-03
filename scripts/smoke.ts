// Pre-demo check against the live ZooWork agent, through the same path as /api/delegate.
//   npm run agent:smoke            # pickup + profile + delivery
//   npm run agent:smoke pickup     # one flow
// Resets the demo profile before and after, so the live run starts clean.
import { emptyOrder } from "../lib/order";
import { DEMO_PROFILE_ID, getProfile, resetProfile } from "../lib/profile/store";
import type { OrderState, TranscriptLine } from "../lib/types";
import { say } from "./chat";

type Flow = { name: string; turns: string[]; check: (order: OrderState) => string | undefined };

const FLOWS: Flow[] = [
  {
    name: "pickup",
    turns: ["I want to make pasta night for four tonight. I'll pick it up at the store.", "That's everything, please place the order."],
    check: (o) =>
      o.items.some((i) => i.product.id === "sw-009")
        ? "parmesan was added despite the milk allergy"
        : o.fulfillment.mode !== "store_pickup"
          ? `fulfillment is ${o.fulfillment.mode}`
          : !o.fulfillment.eta?.includes("code")
            ? "no pickup code (checkout not called)"
            : undefined,
  },
  {
    name: "profile",
    turns: ["Heads up, my daughter just found out she can't have wheat. Can you add bread and pasta?"],
    check: (o) =>
      !getProfile(DEMO_PROFILE_ID)?.allergens.includes("wheat")
        ? "wheat not saved to the profile"
        : o.items.some((i) => i.product.allergens.includes("wheat"))
          ? "a wheat product ended up in the order"
          : undefined,
  },
  {
    name: "delivery",
    turns: ["Can I get oat milk, bananas and spinach delivered to my home?", "Yes, that's all. Send it to Instacart."],
    check: (o) =>
      o.items.length === 0
        ? "order is empty"
        : o.fulfillment.mode !== "instacart_delivery"
          ? `fulfillment is ${o.fulfillment.mode}`
          : !o.fulfillment.checkout_url
            ? "no Instacart checkout_url (checkout not called)"
            : undefined,
  },
];

const only = process.argv[2];
let failed = false;
resetProfile(DEMO_PROFILE_ID);

for (const flow of FLOWS.filter((f) => !only || f.name === only)) {
  console.log(`\n=== ${flow.name} ===`);
  const convo = { transcript: [] as TranscriptLine[], order: emptyOrder() };
  const started = Date.now();
  try {
    for (const text of flow.turns) {
      console.log(`You: ${text}`);
      await say(convo, text);
    }
    const problem = flow.check(convo.order);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (problem) failed = true;
    console.log(problem ? `✗ ${flow.name}: ${problem} (${secs}s)` : `✓ ${flow.name} (${secs}s)`);
  } catch (err) {
    failed = true;
    console.log(`✗ ${flow.name}: ${(err as Error).message}`);
  }
}

resetProfile(DEMO_PROFILE_ID);
process.exit(failed ? 1 : 0);
