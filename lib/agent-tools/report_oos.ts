// Out-of-stock log for the store dashboard. Recorded automatically by the swap tools.
import { productById } from "@/lib/demo-catalog";
import { newId, state } from "@/lib/store/memory";
import type { ReportOosInput, ReportOosOutput } from "@/lib/types";
import { AgentToolError } from "./types";

export async function reportOos(input: ReportOosInput): Promise<ReportOosOutput> {
  if (!productById(input.product_id)) throw new AgentToolError("not_found", `unknown product ${input.product_id}`);
  if (input.outcome === "substituted" && !input.substitute_product_id) {
    throw new AgentToolError("invalid_input", 'substitute_product_id is required when outcome is "substituted"');
  }
  const event = { ...input, event_id: newId("oos"), recorded_at: new Date().toISOString() };
  state.oos.unshift(event);
  return { event_id: event.event_id, recorded_at: event.recorded_at };
}
