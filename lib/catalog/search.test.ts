import assert from "node:assert/strict";
import { test } from "node:test";
import { runTool } from "../tools/index.ts";
import { getProduct, markOutOfStock, resetCatalog } from "./data.ts";
import { searchCatalog } from "./search.ts";

delete process.env.MOSS_PROJECT_ID; // exercise the local engine deterministically
const STORE = "safeway-sf-01";
const OATLY_BARISTA = "sw-000069";

test("finds products by name", async () => {
  const out = await searchCatalog({ query: "oat milk barista" });
  assert.equal(out.engine, "local");
  assert.ok(out.results.length > 0);
  assert.match(out.results[0].product.name, /Barista/);
});

test("substitutes: in stock, original excluded, diet kept, store brand first", async () => {
  const original = getProduct(OATLY_BARISTA)!;
  const out = await searchCatalog({ query: "", substitute_for: OATLY_BARISTA, store_id: STORE });
  assert.ok(out.results.length >= 3);
  for (const r of out.results) {
    assert.notEqual(r.product.id, OATLY_BARISTA);
    assert.equal(r.stock?.in_stock, true);
    assert.equal(r.product.department, original.department);
    for (const t of ["vegan", "dairy_free"] as const) assert.ok(r.product.diet_tags.includes(t), `${r.product.name} lost ${t}`);
    assert.equal(typeof r.price_diff, "number");
  }
  assert.equal(out.results[0].product.store_brand, true);
  assert.match(out.results[0].reason!, /Store brand/);
});

test("diet and allergen filters apply", async () => {
  const out = await searchCatalog({ query: "milk", diet: ["vegan"], exclude_allergens: ["tree_nuts", "soy"], limit: 20 });
  assert.ok(out.results.length > 0);
  for (const r of out.results) {
    assert.ok(r.product.diet_tags.includes("vegan"));
    assert.ok(!r.product.allergens.includes("tree_nuts") && !r.product.allergens.includes("soy"));
  }
});

test("markOutOfStock removes a product from in-stock results", async () => {
  const before = await searchCatalog({ query: "oat milk barista", store_id: STORE });
  const top = before.results[0].product.id;
  markOutOfStock(STORE, top);
  const after = await searchCatalog({ query: "oat milk barista", store_id: STORE });
  assert.ok(!after.results.some((r) => r.product.id === top));
  resetCatalog();
});

test("tool errors are returned, not thrown", async () => {
  assert.deepEqual(await runTool("search_catalog", { query: "x", substitute_for: "nope" }), {
    error: { code: "not_found", message: "Unknown product id nope" },
  });
  const stock: any = await runTool("check_stock", { store_id: STORE, product_ids: [OATLY_BARISTA, "nope"] });
  assert.equal(stock.items[0].in_stock, false);
  assert.deepEqual(stock.unknown_ids, ["nope"]);
  assert.equal(((await runTool("check_stock", { store_id: "x", product_ids: [] })) as any).error.code, "not_found");
});
