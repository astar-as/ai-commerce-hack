import assert from "node:assert/strict";
import { test } from "node:test";
import { runTool } from "../tools/index";
import { resetCatalog } from "./data";
import { matchIngredients, packagesNeeded, parseSize } from "./ingredients";

delete process.env.MOSS_PROJECT_ID; // local engine: deterministic
process.env.CATALOG_SOURCE = "synthetic";
resetCatalog();
const STORE = "safeway-sf-01";

test("parseSize handles the common catalog formats", () => {
  assert.deepEqual(parseSize("1.5 lb"), { value: 1.5 * 453.6, dim: "mass" });
  assert.equal(parseSize("32 fl oz")?.dim, "volume");
  assert.equal(parseSize("1/2 gal")?.value, 0.5 * 3785);
  assert.equal(parseSize("half gal")?.value, 0.5 * 3785);
  assert.deepEqual(parseSize("12 ct"), { value: 12, dim: "count" });
  assert.equal(parseSize("each")?.dim, "count");
  assert.equal(parseSize("mystery"), undefined);
});

test("packagesNeeded covers the recipe amount", () => {
  assert.equal(packagesNeeded(2, "lb", "1 lb"), 2);
  assert.equal(packagesNeeded(1, "lb", "16 oz"), 1); // 5% slack
  assert.equal(packagesNeeded(18, "each", "12 ct"), 2);
  assert.equal(packagesNeeded(1, "cup", "5.3 oz"), 2); // mass↔volume at water density
  assert.equal(packagesNeeded(6, "cloves", "1 ct"), 1); // ~10 cloves per head
  assert.equal(packagesNeeded(2, "cup", "5 lb"), 1);
  assert.equal(packagesNeeded(undefined, undefined, "1 lb"), 1);
  assert.equal(packagesNeeded(3, "each", "mystery size"), 3);
  assert.equal(packagesNeeded(2, "cans", "14.5 oz"), 2);
  assert.equal(packagesNeeded(2, "each", "3 lb"), 1); // 2 onions ≠ two 3 lb bags
  assert.equal(packagesNeeded(100, "lb", "1 lb"), 12); // capped
});

test("tacos: real matches, quantities, staples, unmatched, total", async () => {
  const out = await matchIngredients({
    store_id: STORE,
    ingredients: [
      { name: "ground beef", quantity: 2, unit: "lb" },
      { name: "taco shells", quantity: 12, unit: "each" },
      { name: "shredded mexican blend cheese", quantity: 8, unit: "oz" },
      { name: "salsa" },
      { name: "kosher salt" },
      { name: "water", quantity: 1, unit: "cup" },
      { name: "dragon fruit jam" },
    ],
  });
  const by = Object.fromEntries(out.items.map((i) => [i.ingredient, i]));
  assert.match(by["ground beef"].product!.name, /Ground Beef/);
  assert.equal(by["ground beef"].qty, 2);
  assert.equal(by["ground beef"].stock?.in_stock, true);
  assert.match(by["taco shells"].product!.name, /Taco Shells/);
  assert.equal(by["taco shells"].qty, 1);
  assert.equal(by["kosher salt"].pantry_staple, true);
  assert.equal(by["water"].product, undefined);
  assert.deepEqual(out.unmatched, ["dragon fruit jam"]); // water is never "unmatched"
  const expected = out.items
    .filter((i) => i.product && !i.pantry_staple)
    .reduce((s, i) => s + i.stock!.price * i.qty, 0);
  assert.equal(out.total, Math.round(expected * 100) / 100);
});

test("diet filter: dairy-free household gets no dairy cheese", async () => {
  const out = await matchIngredients({ store_id: STORE, diet: ["dairy_free"], ingredients: [{ name: "shredded mexican blend cheese" }] });
  for (const i of out.items) if (i.product) assert.ok(i.product.diet_tags.includes("dairy_free"));
});

test("tool wrapper validates input", async () => {
  assert.equal(((await runTool("match_ingredients", { ingredients: [] })) as any).error.code, "invalid_input");
  assert.equal(((await runTool("match_ingredients", { store_id: "x", ingredients: [{ name: "salt" }] })) as any).error.code, "not_found");
});

test("synonyms and different-product words", async () => {
  const out = await matchIngredients({ store_id: STORE, ingredients: [{ name: "spaghetti noodles" }, { name: "butter" }] });
  const by = Object.fromEntries(out.items.map((i) => [i.ingredient, i]));
  assert.match(by["spaghetti noodles"].product!.name, /Spaghetti/); // noodles ≈ pasta
  assert.doesNotMatch(by["butter"].product!.name, /Peanut|Plant/); // not peanut butter / plant butter
});
