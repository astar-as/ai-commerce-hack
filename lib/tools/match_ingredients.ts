import { matchIngredients } from "../catalog/ingredients";
import { ALLERGENS, DIET_TAGS, type MatchIngredientsInput, type MatchIngredientsOutput } from "../types";

export const matchIngredientsTool = {
  name: "match_ingredients",
  description:
    "Turn a recipe's ingredient list into real products at the store, in one call. Use it after choosing and " +
    "scaling a recipe (\"chicken tikka masala for 4\"). Each ingredient gets the best in-stock product (store " +
    "brand preferred), qty = packages to buy, price/aisle, and 2 alternatives. pantry_staple=true (salt, oil, " +
    "spices…) means ask the shopper whether they already have it before adding. unmatched lists ingredients " +
    "the store doesn't carry. total excludes pantry staples and optional items.",
  input_schema: {
    type: "object",
    properties: {
      store_id: { type: "string", description: "Defaults to the demo store." },
      ingredients: {
        type: "array",
        maxItems: 40,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: 'Generic ingredient, e.g. "boneless chicken thighs", "heavy cream".' },
            quantity: { type: "number", description: "Recipe amount, already scaled to the servings." },
            unit: { type: "string", description: 'e.g. "lb", "oz", "cup", "tbsp", "each".' },
            optional: { type: "boolean" },
          },
          required: ["name"],
        },
      },
      diet: { type: "array", items: { type: "string", enum: [...DIET_TAGS] } },
      exclude_allergens: { type: "array", items: { type: "string", enum: [...ALLERGENS] } },
    },
    required: ["ingredients"],
  },
  run: (input: MatchIngredientsInput): Promise<MatchIngredientsOutput> => matchIngredients(input),
};
