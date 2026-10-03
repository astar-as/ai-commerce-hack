// (Re)builds the Moss index from the active catalog (CATALOG_SOURCE) and runs a test query.
// Needs MOSS_PROJECT_ID + MOSS_PROJECT_KEY. Run: npm run moss:index
import { allProducts } from "../lib/catalog/data";
import { mossClient, mossConfigured, mossIndexName, productToDoc } from "../lib/catalog/moss";

if (!mossConfigured()) {
  console.error("Set MOSS_PROJECT_ID and MOSS_PROJECT_KEY (see .env.example)");
  process.exit(1);
}

const client = mossClient();
const name = mossIndexName();
const docs = allProducts().map(productToDoc);

const existing = await client.listIndexes();
if (existing.some((i) => i.name === name)) {
  console.log(`Deleting existing index ${name}…`);
  await client.deleteIndex(name);
}
console.log(`Creating ${name} with ${docs.length} docs…`);
await client.createIndex(name, docs, {
  onProgress: (p) => process.stdout.write(`\r  ${p.status} ${p.currentPhase ?? ""} ${Math.round(p.progress)}%   `),
});
console.log("\nLoading and test-querying…");
await client.loadIndex(name);
const res = await client.query(name, "dairy-free barista milk", { topK: 3 });
for (const d of res.docs) console.log(`  [${d.score.toFixed(3)}] ${d.id} ${d.text.split(". ")[0]}`);
console.log(`  ${res.timeTakenInMs ?? "?"} ms`);
await client.close();
