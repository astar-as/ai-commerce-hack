// Writes mocks/*.json from real tool output on the Kroger catalog (demo case: Oatly Barista out at kroger-01400513).
import { writeFileSync } from "node:fs";
import { runTool } from "../lib/tools/index";

delete process.env.MOSS_PROJECT_ID;
process.env.CATALOG_SOURCE = "kroger";
const write = (name: string, data: unknown) =>
  writeFileSync(new URL(`../mocks/${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");

write("search_catalog", await runTool("search_catalog", { query: "", substitute_for: "kr-0019064664001", store_id: "kroger-01400513", limit: 3 }));
write("check_stock", await runTool("check_stock", { store_id: "kroger-01400513", product_ids: ["kr-0019064664001", "kr-0004410015618", "kr-0001111013269"] }));
console.log("mocks written");
