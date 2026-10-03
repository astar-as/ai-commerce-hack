// Writes mocks/*.json from real tool output on the synthetic catalog (demo case: Oatly Barista out at safeway-sf-01).
import { writeFileSync } from "node:fs";
import { runTool } from "../lib/tools/index";

delete process.env.MOSS_PROJECT_ID;
const write = (name: string, data: unknown) =>
  writeFileSync(new URL(`../mocks/${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");

write("search_catalog", await runTool("search_catalog", { query: "", substitute_for: "sw-000069", store_id: "safeway-sf-01", limit: 3 }));
write("check_stock", await runTool("check_stock", { store_id: "safeway-sf-01", product_ids: ["sw-000069", "sw-000072", "sw-000233"] }));
console.log("mocks written");
