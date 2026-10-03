// Run: node --test lib/tools/send_to_instacart.test.ts   (Node ≥ 22.18, no deps)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Dynamic import keeps the ".ts" extension out of the app's type-check.
const mod = await import(new URL("./send_to_instacart.ts", import.meta.url).href);
const { sendToInstacart, buildInstacartRequest, decodeMockCart, normalizeUnit, clearLinkCache } = mod;

const LIST = {
  title: "Week of Oct 5 — family of 3",
  items: [
    { product_id: "sw-000123", name: "oat milk", display_text: "O Organics Oat Milk, 64 fl oz", quantity: 2, unit: "fl oz", brand: "O Organics", health_filters: ["VEGAN"] },
    { name: "bananas", quantity: 6 },
  ],
};

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  };
  return { fn, calls };
}

const KEYED_ENV = { INSTACART_API_KEY: "test-key", APP_URL: "https://basket.example" };

beforeEach(() => clearLinkCache());

test("returns the Instacart link when the API succeeds", async () => {
  const f = fakeFetch(() => Response.json({ products_link_url: "https://instacart.example/list/abc" }));
  const out = await sendToInstacart(LIST, { fetch: f.fn, env: KEYED_ENV });

  assert.deepEqual(out, { url: "https://instacart.example/list/abc", item_count: 2, mode: "instacart" });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, "https://connect.dev.instacart.tools/idp/v1/products/products_link");
  const headers = f.calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
});

test("sends Instacart's request shape: measurements, filters, linkback", () => {
  const body = buildInstacartRequest(LIST, "https://basket.example");
  assert.equal(body.link_type, "shopping_list");
  assert.deepEqual(body.line_items[0], {
    name: "oat milk",
    display_text: "O Organics Oat Milk, 64 fl oz",
    line_item_measurements: [{ quantity: 2, unit: "fl oz container" }],
    filters: { brand_filters: ["O Organics"], health_filters: ["VEGAN"] },
  });
  assert.deepEqual(body.line_items[1], {
    name: "bananas",
    line_item_measurements: [{ quantity: 6, unit: "each" }],
  });
  assert.deepEqual(body.landing_page_configuration, { partner_linkback_url: "https://basket.example" });
});

test("reuses the link for an unchanged list", async () => {
  const f = fakeFetch(() => Response.json({ products_link_url: "https://instacart.example/list/abc" }));
  await sendToInstacart(LIST, { fetch: f.fn, env: KEYED_ENV });
  await sendToInstacart(LIST, { fetch: f.fn, env: KEYED_ENV });
  assert.equal(f.calls.length, 1);
});

test("falls back to the mock cart without a key", async () => {
  const f = fakeFetch(() => assert.fail("should not call Instacart"));
  const out = await sendToInstacart(LIST, { fetch: f.fn, env: { APP_URL: "https://basket.example" } });
  assert.equal(out.mode, "mock");
  assert.match(out.url, /^https:\/\/basket\.example\/cart\/mock\?list=/);
  assert.equal(out.item_count, 2);
});

test("MOCK_TOOLS=1 forces the mock cart even with a key", async () => {
  const f = fakeFetch(() => assert.fail("should not call Instacart"));
  const out = await sendToInstacart(LIST, { fetch: f.fn, env: { ...KEYED_ENV, MOCK_TOOLS: "1" } });
  assert.equal(out.mode, "mock");
});

test("falls back to the mock cart when Instacart errors", async () => {
  const f = fakeFetch(() => Response.json({ error_message: "bad", error_code: 1001 }, { status: 400 }));
  const out = await sendToInstacart(LIST, { fetch: f.fn, env: KEYED_ENV });
  assert.equal(out.mode, "mock");
  assert.match(out.fallback_reason, /400/);
});

test("falls back to the mock cart when the network fails", async () => {
  const f = fakeFetch(() => { throw new TypeError("fetch failed"); });
  const out = await sendToInstacart(LIST, { fetch: f.fn, env: KEYED_ENV });
  assert.equal(out.mode, "mock");
});

test("mock cart URL round-trips the list", async () => {
  const out = await sendToInstacart(LIST, { fetch: fetch, env: { APP_URL: "https://basket.example/" } });
  const list = new URL(out.url).searchParams.get("list")!;
  assert.deepEqual(decodeMockCart(list), { title: LIST.title, items: LIST.items });
  assert.equal(decodeMockCart("not-json"), null);
});

test("rejects invalid input with the shared error shape", async () => {
  const env = KEYED_ENV;
  const f = fakeFetch(() => assert.fail("should not call Instacart"));
  for (const bad of [
    {},
    { title: "x", items: [] },
    { title: "x", items: [{ name: "", quantity: 1 }] },
    { title: "x", items: [{ name: "milk", quantity: 0 }] },
    { title: "x", items: [{ name: "milk", quantity: 1, health_filters: ["DAIRY_FREE"] }] },
  ]) {
    const out = await sendToInstacart(bad, { fetch: f.fn, env });
    assert.equal(out.error?.code, "invalid_input", JSON.stringify(bad));
  }
});

test("normalizes units to Instacart's list, defaulting to each", () => {
  assert.equal(normalizeUnit(undefined), "each");
  assert.equal(normalizeUnit("LBS"), "lb");
  assert.equal(normalizeUnit("gallons"), "gallon");
  assert.equal(normalizeUnit("jar-ish"), "each");
});

test("builds the Instacart list from the live order, skipping out-of-stock items", () => {
  const product = (id: string, extra: object = {}) => ({
    id, name: `Product ${id}`, brand: "O Organics", store_brand: true, department: "d", aisle: "1",
    size: "64 fl oz", price: 4.99, diet_tags: [], allergens: [], ...extra,
  });
  const order = {
    fulfillment: { mode: "instacart_delivery", store: { id: "safeway-sf-01", name: "Safeway Market St" } },
    items: [
      { product: product("a", { diet_tags: ["organic", "dairy_free"] }), qty: 2, status: "added" },
      { product: product("b"), qty: 1, status: "out_of_stock" },
    ],
    subtotal: 9.98,
  };
  const list = mod.orderToInstacartList(order);
  assert.equal(list.title, "Basket — Safeway Market St");
  assert.deepEqual(list.items, [{
    product_id: "a", name: "Product a", display_text: "Product a, 64 fl oz", quantity: 2, unit: "each",
    brand: "O Organics", health_filters: ["ORGANIC"],
  }]);
});

test("withCheckoutUrl only touches Instacart delivery orders", async () => {
  const order = { fulfillment: { mode: "in_store", store: { id: "s", name: "S" } }, items: [], subtotal: 0 };
  assert.equal(await mod.withCheckoutUrl(order, "https://basket.example"), order);
});
