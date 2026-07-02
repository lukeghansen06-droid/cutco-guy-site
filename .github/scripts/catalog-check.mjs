// Catalog integrity check: products <-> SKU mappings <-> image files must stay in sync.
// Invariant: P.length === IMG entries === assets/products/*.jpg count, with no missing
// mappings, no missing image files, no orphan images, and no duplicate product names.
// Does NOT hardcode 89 — it enforces "all in sync" so an intentional catalog change is fine.
import fs from "node:fs";

const src = fs.readFileSync("assets/explorer.js", "utf8");

const names = [...src.matchAll(/\{n:'([^']*)'/g)].map((m) => m[1]);
const imgBlock = (src.match(/var IMG=\{([\s\S]*?)\};/) || [])[1] || "";
const img = {};
for (const m of imgBlock.matchAll(/'([^']+)':'([^']+)'/g)) img[m[1]] = m[2];

const files = new Set(
  fs.readdirSync("assets/products").filter((f) => f.endsWith(".jpg"))
);

const missingMap = names.filter((n) => !(n in img));
const missingFile = names.filter((n) => img[n] && !files.has(img[n] + ".jpg"));
const used = new Set(names.filter((n) => img[n]).map((n) => img[n] + ".jpg"));
const orphans = [...files].filter((f) => !used.has(f));
const dups = names.filter((n, i) => names.indexOf(n) !== i);

const counts = `products=${names.length} skuMappings=${Object.keys(img).length} imageFiles=${files.size}`;
console.log(counts);

const problems = [];
if (new Set([names.length, Object.keys(img).length, files.size]).size !== 1)
  problems.push("counts are not all equal");
if (missingMap.length) problems.push(`products with no image mapping: ${missingMap.join(", ")}`);
if (missingFile.length) problems.push(`products missing their SKU .jpg: ${missingFile.join(", ")}`);
if (orphans.length) problems.push(`orphan image files: ${orphans.join(", ")}`);
if (dups.length) problems.push(`duplicate product names: ${[...new Set(dups)].join(", ")}`);

if (problems.length) {
  console.error("❌ Catalog integrity FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✅ Catalog integrity OK — ${names.length} products ↔ SKUs ↔ images, all in sync.`);
