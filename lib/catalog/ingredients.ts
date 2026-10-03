// Engine behind match_ingredients: recipe ingredients → real in-stock products in one call.
// Each ingredient runs through searchCatalog (Moss when configured), then we pick the best match
// (store brand when it's about as relevant), work out how many packages cover the recipe amount,
// and flag pantry staples so the agent can ask instead of adding them.

import { defaultStore, getStore } from "./data";
import { SearchError, searchCatalog } from "./search";
import type { MatchIngredientsInput, MatchIngredientsOutput, MatchedIngredient, SearchResult } from "../types";

const MAX_INGREDIENTS = 40;
const MAX_QTY = 12;

// Things most kitchens already have: matched, but not added to the total — the agent asks first.
const PANTRY_STAPLE =
  /\b(salt|black pepper|peppercorns?|olive oil|vegetable oil|canola oil|cooking oil|cooking spray|sugar|brown sugar|flour|baking soda|baking powder|vanilla extract|vinegar|soy sauce|garlic powder|onion powder|paprika|cumin|turmeric|coriander|chili powder|chilli powder|cayenne|oregano|thyme|rosemary|basil|bay leaf|bay leaves|cinnamon|nutmeg|garam masala|curry powder|red pepper flakes|ketchup|mustard|mayonnaise|honey)\b/i;
// Never a product.
const NOT_A_PRODUCT = /^(water|ice|ice cubes|hot water|cold water|boiling water)$/i;

// --- units: normalize to grams, milliliters or count ---

type Amount = { value: number; dim: "mass" | "volume" | "count" };

const UNIT: Record<string, [number, Amount["dim"]]> = {
  g: [1, "mass"], gram: [1, "mass"], grams: [1, "mass"], kg: [1000, "mass"],
  oz: [28.35, "mass"], ounce: [28.35, "mass"], ounces: [28.35, "mass"],
  lb: [453.6, "mass"], lbs: [453.6, "mass"], pound: [453.6, "mass"], pounds: [453.6, "mass"],
  ml: [1, "volume"], l: [1000, "volume"], liter: [1000, "volume"], litre: [1000, "volume"],
  "fl oz": [29.57, "volume"], cup: [236.6, "volume"], cups: [236.6, "volume"],
  tbsp: [14.79, "volume"], tablespoon: [14.79, "volume"], tablespoons: [14.79, "volume"],
  tsp: [4.93, "volume"], teaspoon: [4.93, "volume"], teaspoons: [4.93, "volume"],
  pt: [473.2, "volume"], pint: [473.2, "volume"], qt: [946.4, "volume"], quart: [946.4, "volume"],
  gal: [3785, "volume"], gallon: [3785, "volume"],
  each: [1, "count"], ea: [1, "count"], ct: [1, "count"], count: [1, "count"], pk: [1, "count"],
  clove: [0.1, "count"], cloves: [0.1, "count"], // ~10 cloves per head of garlic
  can: [1, "count"], cans: [1, "count"],
};

function toAmount(value: number, unit: string | undefined): Amount | undefined {
  const u = (unit ?? "each").trim().toLowerCase().replace(/\.$/, "");
  const known = UNIT[u];
  return known ? { value: value * known[0], dim: known[1] } : undefined;
}

// "1.5 lb", "32 fl oz", "1/2 gal", "12 ct", "4 ct / 3.4 oz", "3 lb bag", "each"
export function parseSize(size: string): Amount | undefined {
  const s = size.toLowerCase();
  if (/^each$/.test(s.trim())) return { value: 1, dim: "count" };
  if (s.trim().startsWith("half gal")) return toAmount(0.5, "gal");
  const m = s.match(/(\d+\s*\/\s*\d+|\d*\.?\d+)\s*(fl oz|[a-z]+)/);
  if (!m) return undefined;
  const value = m[1].includes("/") ? Number(m[1].split("/")[0]) / Number(m[1].split("/")[1]) : Number(m[1]);
  return toAmount(value, m[2]);
}

export function packagesNeeded(quantity: number | undefined, unit: string | undefined, size: string): number {
  if (!quantity || quantity <= 0) return 1;
  const need = toAmount(quantity, unit);
  const pack = parseSize(size);
  if (!need || !pack || pack.value <= 0) return need?.dim === "count" && !pack ? Math.min(MAX_QTY, Math.ceil(quantity)) : 1;
  // "2 cans" / "3 jars" against a package sold by weight: one package per item. ("2 onions" vs a 3 lb bag is not.)
  if (need.dim === "count" && pack.dim !== "count")
    return /^(cans?|jars?|box(es)?|packages?|pkgs?|bottles?)$/i.test(unit ?? "") ? Math.min(MAX_QTY, Math.ceil(quantity)) : 1;
  // Mass ↔ volume at water density (1 g ≈ 1 ml): close enough for yogurt, cream, flour-vs-bag sizing.
  const comparable = need.dim === pack.dim || (need.dim !== "count" && pack.dim !== "count");
  if (!comparable) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.ceil(need.value / pack.value - 0.05))); // 5% slack: 15.9 oz ≈ 16 oz
}

// --- matching ---

const words = (s: string) => s.toLowerCase().match(/[a-z]{3,}/g) ?? [];
const stem = (w: string) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "");

// Lexical sanity check so a weak semantic hit doesn't count as a match: the ingredient's head noun
// (last word: "ground BEEF", "dragon fruit JAM") must be in the product name, and so must most of
// the other words ("ground beef" ≠ "ribeye beef steak").
function plausible(ingredient: string, r: SearchResult): boolean {
  const name = new Set(words(`${r.product.name} ${r.product.aisle}`).map(stem));
  const want = words(ingredient).map(stem);
  if (want.length === 0) return false;
  const hits = want.filter((w) => name.has(w)).length;
  // Up to 3 words: all must match. Longer names may miss one ("boneless skinless chicken thighs").
  return name.has(want[want.length - 1]) && hits >= (want.length <= 3 ? want.length : want.length - 1);
}

// Words that turn an ingredient into a different product ("butter" → butter *spray*), unless asked for.
const MODIFIERS = new Set(
  "spray spread blend patty patties cup cups microwavable microwaveable ready flavored flavor seasoned mix sauce soup chip chips snack snacks bar bars dressing dip cinnamon sweetened candy cereal baby kid kids frozen instant powder extract substitute style kit meal bowl".split(" "),
);
// A different food right before the main noun makes a different product: peanut butter, oat milk, almond flour.
const COMPOUND = new Set(
  "peanut almond cashew sunflower hazelnut walnut pecan coconut oat soy rice apple cocoa shea cinnamon garlic herb honey cookie nut chocolate vanilla strawberry banana pumpkin corn potato chickpea".split(" "),
);
const FILLER = new Set("and with the for of in fresh original classic natural pack count lb lbs oz ct fl tray bag big deal each".split(" "));

// How well a product name fits the ingredient: 1 minus extra words, minus different-product words.
function fit(ingredient: string, r: SearchResult): number {
  const want = new Set(words(ingredient).map(stem));
  const brand = new Set(words(r.product.brand).map(stem));
  const extra = words(r.product.name)
    .map(stem)
    .filter((w) => !want.has(w) && !brand.has(w) && !FILLER.has(w));
  const modifiers = extra.filter((w) => MODIFIERS.has(w)).length;
  // The word just before the ingredient's main noun in the product name, e.g. "peanut" in "peanut butter".
  const head = [...want].pop()!;
  const nameWords = words(r.product.name).map(stem);
  const before = nameWords[nameWords.indexOf(head) - 1];
  const compound = before && !want.has(before) && COMPOUND.has(before) ? 1 : 0;
  return 1 - 0.06 * extra.length - 0.5 * (modifiers + compound) + (r.product.store_brand ? 0.05 : 0);
}

function pick(
  ingredient: { name: string; quantity?: number; unit?: string },
  results: SearchResult[],
): { best?: SearchResult; rest: SearchResult[] } {
  const ok = results.filter((r) => plausible(ingredient.name, r));
  if (ok.length === 0) return { rest: [] };
  // Best name fit first; among near-equal fits (±0.05), the cheapest way to cover the recipe amount.
  const cost = (r: SearchResult) =>
    packagesNeeded(ingredient.quantity, ingredient.unit, r.product.size) * (r.stock?.price ?? r.product.price);
  const scored = ok.map((r) => ({ r, fit: fit(ingredient.name, r), cost: cost(r) }));
  const topFit = Math.max(...scored.map((x) => x.fit));
  const best = scored.filter((x) => x.fit >= topFit - 0.05).sort((a, b) => a.cost - b.cost)[0].r;
  const rest = scored
    .filter((x) => x.r !== best)
    .sort((a, b) => b.fit - a.fit)
    .map((x) => x.r);
  return { best, rest };
}

export async function matchIngredients(input: MatchIngredientsInput): Promise<MatchIngredientsOutput> {
  const started = performance.now();
  const ingredients = input.ingredients;
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    throw new SearchError("invalid_input", "ingredients must be a non-empty array");
  if (ingredients.length > MAX_INGREDIENTS)
    throw new SearchError("invalid_input", `at most ${MAX_INGREDIENTS} ingredients per call`);
  const storeId = input.store_id ?? defaultStore().id;
  if (!getStore(storeId)) throw new SearchError("not_found", `Unknown store ${storeId}`);

  const items: MatchedIngredient[] = await Promise.all(
    ingredients.map(async (ing): Promise<MatchedIngredient> => {
      const name = String(ing?.name ?? "").trim();
      const pantry_staple = PANTRY_STAPLE.test(name);
      if (!name || NOT_A_PRODUCT.test(name)) return { ingredient: name, qty: 0, alternatives: [], pantry_staple: true };
      const { results } = await searchCatalog({
        query: name,
        store_id: storeId,
        diet: input.diet,
        exclude_allergens: input.exclude_allergens,
        limit: 12, // a wider net so name fit can beat Moss's ranking on one-word ingredients
      });
      const { best, rest } = pick({ ...ing, name }, results);
      if (!best) return { ingredient: name, qty: 0, alternatives: [], pantry_staple, ...(ing.optional && { optional: true }) };
      return {
        ingredient: name,
        product: best.product,
        ...(best.stock && { stock: best.stock }),
        qty: packagesNeeded(ing.quantity, ing.unit, best.product.size),
        alternatives: rest.slice(0, 2).map((r) => r.product),
        pantry_staple,
        ...(ing.optional && { optional: true }),
      };
    }),
  );

  const unmatched = items.filter((i) => !i.product && !NOT_A_PRODUCT.test(i.ingredient)).map((i) => i.ingredient);
  const total = items
    .filter((i) => i.product && !i.pantry_staple && !i.optional)
    .reduce((sum, i) => sum + (i.stock?.price ?? i.product!.price) * i.qty, 0);

  return {
    store_id: storeId,
    items,
    unmatched,
    total: Math.round(total * 100) / 100,
    took_ms: Math.round((performance.now() - started) * 10) / 10,
  };
}
