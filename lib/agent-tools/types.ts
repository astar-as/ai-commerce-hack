// Types for the ZooWork agent's custom tools. Product/order types come from lib/types.ts.
import type { Profile } from "@/lib/profile/store";
import type { OrderAction, OrderState } from "@/lib/types";

export type ToolErrorCode = "not_found" | "invalid_input" | "upstream_failed";

export class AgentToolError extends Error {
  constructor(public code: ToolErrorCode, message: string) {
    super(message);
  }
}

// Per-turn state the backend owns. The model never supplies it.
export type ToolContext = {
  profile?: Profile; // the household: allergens and diet are enforced in the tools
  order: OrderState; // the order the screen renders; order tools change it
  actions: OrderAction[]; // what changed this turn, returned to the frontend
  historyHits?: Map<string, number>; // product id → days since bought, from search_order_history
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tools with different inputs share one registry
export type ToolDefinition<I = any, O = any> = {
  name: string;
  // Read by the model to decide when to call the tool. Keep it about *when* and *what*.
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
  run: (input: I, ctx: ToolContext) => Promise<O>;
};
