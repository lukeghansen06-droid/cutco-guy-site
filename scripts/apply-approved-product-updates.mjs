#!/usr/bin/env node
/*
 * scripts/apply-approved-product-updates.mjs
 * Applies ONLY manually-approved price updates from reports/cutco-audit/approved-updates.json.
 *
 * SAFETY
 *   - Dry-run by default. Pass --apply to actually write.
 *   - Backs up assets/explorer.js before writing.
 *   - Applies ONLY entries with "approved": true.
 *   - Validates the SKU maps to a product and the exact current price string exists.
 *   - Refuses ambiguous / unmatched items (prints them, changes nothing).
 *   - NEVER fetches or guesses a price. It only writes what Luke put in the file.
 *
 * USAGE
 *   node scripts/apply-approved-product-updates.mjs           # dry-run (diff only)
 *   node scripts/apply-approved-product-updates.mjs --apply   # write (with backup)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const APPROVED = path.join(ROOT, 'reports', 'cutco-audit', 'approved-updates.json');
const EXPLORER = path.join(ROOT, 'assets', 'explorer.js');

if (!fs.existsSync(APPROVED)) {
  console.error('No approved-updates.json found. Copy approved-updates.example.json and fill it in first.');
  process.exit(1);
}
const approved = JSON.parse(fs.readFileSync(APPROVED, 'utf8'));
let src = fs.readFileSync(EXPLORER, 'utf8');

// SKU -> name from IMG
function evalObj(name) {
  const i = src.indexOf('var ' + name + '=');
  const s = src.indexOf('{', i), e = src.indexOf('};', s) + 1;
  try { return new Function('return (' + src.slice(s, e) + ')')(); } catch { return {}; }
}
const IMG = evalObj('IMG');
const skuToName = {};
Object.entries(IMG).forEach(([n, s]) => { skuToName[s] = n; });

const centsToPrice = (c) => '$' + Math.round(c / 100).toLocaleString('en-US');

const planned = [], refused = [];
for (const u of (approved.updates || [])) {
  if (u.approved !== true) { refused.push(`${u.sku || u.id}: not approved (skipped)`); continue; }
  const name = skuToName[u.sku];
  if (!name) { refused.push(`${u.sku}: SKU not found in catalog`); continue; }
  if (u.productName && u.productName !== name) { refused.push(`${u.sku}: productName "${u.productName}" != catalog "${name}"`); continue; }
  if (typeof u.newPriceCents !== 'number' || u.newPriceCents <= 0) { refused.push(`${u.sku}: invalid newPriceCents`); continue; }
  // current price string from source: '<name>':'<price>'
  const m = src.match(new RegExp("('" + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "':')(\\$?[^']*)(')"));
  if (!m) { refused.push(`${u.sku} (${name}): exact price entry not found — refusing`); continue; }
  const oldPrice = m[2];
  const newPrice = centsToPrice(u.newPriceCents);
  planned.push({ sku: u.sku, name, oldPrice, newPrice, match: m[0], replacement: m[1] + newPrice + m[3] });
}

console.log(`\nApproved updates: ${(approved.updates || []).length} | applicable: ${planned.length} | refused: ${refused.length}`);
if (refused.length) { console.log('\nRefused (unchanged):'); refused.forEach((r) => console.log('  - ' + r)); }
console.log('\nPlanned price changes:');
planned.forEach((p) => console.log(`  - ${p.name} [${p.sku}]  ${p.oldPrice || '(none)'}  ->  ${p.newPrice}`));

if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply to write (a backup is made first).'); process.exit(0); }
if (!planned.length) { console.log('\nNothing to apply.'); process.exit(0); }

const backup = EXPLORER + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(backup, src);
planned.forEach((p) => { src = src.replace(p.match, p.replacement); });
fs.writeFileSync(EXPLORER, src);
console.log(`\nAPPLIED ${planned.length} update(s). Backup: ${path.basename(backup)}`);
console.log('Next: bump sw.js CACHE, run bun test, review the diff, and get approval before commit/push.');
