// Recipe ingredients → real products in one call, on lib/catalog/ingredients (owner 2, PLAN §6).
// Proposals only: nothing reaches the order until the agent reviews them and calls add_item.
import { matchIngredients } from "@/lib/catalog/ingredients";
import { DEMO_STORE } from "@/lib/demo-catalog";
import { profileViolations } from "@/lib/profile/guard";
import type { MatchIngredientsInput } from "@/lib/types";
import { AgentToolError, type ToolDefinition } from "./types";

type Input = Pick<MatchIngredientsInput, "ingredients">;

export const matchIngredientsTool: ToolDefinition<Input> = {
  name: "match_ingredients",
  description:
    "Turn a whole recipe into store products in one call. Pass every ingredient, already scaled to the " +
    "servings (name, quantity, unit, optional). The household's allergens and diet are applied automatically. " +
    "Returns a proposed product per ingredient with packages to buy (qty), alternatives, and pantry_staple; " +
    "ingredients with no safe in-stock match are in unmatched. These are proposals: check each one against " +
    "the recipe, then add the good ones with add_item × qty.",
  input_schema: {
    type: "object",
    properties: {
      ingredients: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: 'e.g. "boneless chicken thighs", "garam masala"' },
            quantity: { type: "number", description: "Recipe amount, already scaled, e.g. 1.5" },
            unit: { type: "string", description: '"lb", "cup", "tbsp", "each"…' },
            optional: { type: "boolean", description: "Garnish and the like." },
          },
          required: ["name"],
        },
      },
    },
    required: ["ingredients"],
  },
  run: async ({ ingredients }, ctx) => {
    if (!Array.isArray(ingredients) || ingredients.length === 0) throw new AgentToolError("invalid_input", "ingredients must not be empty");
    const out = await matchIngredients({
      store_id: DEMO_STORE.id,
      ingredients,
      diet: ctx.profile?.diet,
      exclude_allergens: ctx.profile?.allergens,
    });

    const unmatched = [...out.unmatched];
    const items = out.items.flatMap((item) => {
      // Belt and braces: never propose a product the profile blocks.
      if (!item.product || profileViolations(item.product, ctx.profile).length) {
        if (item.product && !unmatched.includes(item.ingredient)) unmatched.push(item.ingredient);
        return [];
      }
      return [{
        ingredient: item.ingredient,
        product_id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        size: item.product.size,
        price: item.stock?.price ?? item.product.price,
        aisle: item.stock?.aisle_number ?? item.product.aisle,
        qty: item.qty,
        pantry_staple: item.pantry_staple,
        alternatives: item.alternatives
          .filter((p) => profileViolations(p, ctx.profile).length === 0)
          .map((p) => ({ id: p.id, name: p.name, size: p.size, price: p.price })),
      }];
    });
    return { store: DEMO_STORE.name, items, unmatched, total: out.total, took_ms: out.took_ms };
  },
};
