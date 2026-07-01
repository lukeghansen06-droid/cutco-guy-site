#!/usr/bin/env node
/*
 * scripts/audit-cutco-products.mjs
 * Cutco Product Audit — REPORT ONLY. Human-in-the-loop.
 *
 * WHAT IT DOES
 *   - Reads the local catalog from assets/explorer.js (P, IMG, PRICES, VALUES).
 *   - Runs LOCAL integrity checks: missing SKU / price / image, duplicate SKUs,
 *     product-count reconciliation, and price "confidence status".
 *   - With --online[=N], best-effort checks each official Cutco URL for
 *     reachability and *candidate* price/image signals — and honestly marks
 *     "manual_review_required" whenever the page is JS-rendered, blocked,
 *     ambiguous, or shows multiple money values.
 *   - Writes a human-review report to reports/cutco-audit/.
 *
 * WHAT IT NEVER DOES
 *   - Never edits prices. Never overwrites images. Never commits/pushes/deploys.
 *   - Never publishes a scraped price. Candidate data is advisory only.
 *
 * USAGE
 *   node scripts/audit-cutco-products.mjs            # local integrity only
 *   node scripts/audit-cutco-products.mjs --online   # + check every official URL
 *   node scripts/audit-cutco-products.mjs --online=8 # + check first 8 URLs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recommenderCatNames, now } from './lib/audit-common.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'reports', 'cutco-audit');
const CAND = path.join(OUT, 'image-candidates');
fs.mkdirSync(OUT, { recursive: true });

const arg = process.argv.find((a) => a.startsWith('--online'));
const ONLINE = arg ? (arg.includes('=') ? parseInt(arg.split('=')[1], 10) || Infinity : Infinity) : 0;

// ---- robust string/bracket-aware literal extractor for our own explorer.js ----
function extractLiteral(src, varName) {
  const i = src.indexOf('var ' + varName + '=');
  if (i < 0) return null;
  let j = src.indexOf('=', i) + 1;
  while (src[j] === ' ') j++;
  const open = src[j], close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = '';
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (inStr) { if (c === '\\') { k++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return src.slice(j, k + 1);
  }
  return null;
}
const evalLit = (src, name) => {
  const lit = extractLiteral(src, name);
  if (!lit) return null;
  try { return new Function('return (' + lit + ')')(); } catch (e) { return { __err: e.message }; }
};

// ---- load catalog ----
const ex = fs.readFileSync(path.join(ROOT, 'assets', 'explorer.js'), 'utf8');
// P items reference a URL map `U` (e.g. u:U.gifts) and sit between `var P=` and `var IMG=`.
const U = (() => {
  const i = ex.search(/var U\s*=/); if (i < 0) return {};
  const s = ex.indexOf('{', i), e = ex.indexOf('};', s) + 1;
  try { return new Function('return (' + ex.slice(s, e) + ')')(); } catch { return {}; }
})();
const P = (() => {
  const a = ex.indexOf('var P=['), b = ex.indexOf('var IMG=');
  if (a < 0 || b < 0) return [];
  const seg = ex.slice(a + 6, b), t = seg.slice(seg.indexOf('['), seg.lastIndexOf(']') + 1);
  try { return new Function('U', 'return (' + t + ')')(U); } catch { return []; }
})();
const IMG = evalLit(ex, 'IMG') || {};
const PRICES = evalLit(ex, 'PRICES') || {};
const VALUES = evalLit(ex, 'VALUES') || {};
const imgDir = path.join(ROOT, 'assets', 'products');
const imgFiles = new Set(fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter((f) => f.endsWith('.jpg')).map((f) => f.replace(/\.jpg$/, '')) : []);

// ---- price confidence ----
function priceStatus(name) {
  const p = PRICES[name];
  if (p == null || p === '') return 'unavailable';
  return 'verified_snapshot'; // hand-set "June 2026 snapshot" — NOT live-verified
}

// ---- stale-snapshot logic (never changes a price; just flags for human review) ----
const nowD = now();
const snapshotStale = nowD.getUTCFullYear() > 2026 || (nowD.getUTCFullYear() === 2026 && nowD.getUTCMonth() + 1 > 6);
function staleStatusFor(name, officialUrl) {
  if (!officialUrl) return 'needs_review';            // no direct official URL to re-verify against
  if (PRICES[name] == null || PRICES[name] === '') return 'needs_review'; // no snapshot label/price
  return snapshotStale ? 'stale_snapshot' : 'ok';     // June 2026 snapshot is now older than this month
}

// ---- build per-product audit ----
const skuCount = {};
Object.values(IMG).forEach((s) => { skuCount[s] = (skuCount[s] || 0) + 1; });

const rows = (Array.isArray(P) ? P : []).map((p) => {
  const name = p.n;
  const sku = IMG[name] || null;
  const localImage = sku ? `/assets/products/${sku}.jpg` : null;
  return {
    name,
    sku,
    category: p.c || null,
    localPrice: PRICES[name] || null,
    priceStatus: priceStatus(name),
    priceVerifiedLabel: PRICES[name] ? 'June 2026 snapshot' : null,
    officialUrl: p.u || null,
    localImage,
    imageExists: sku ? imgFiles.has(sku) : false,
    staleStatus: staleStatusFor(name, p.u || null),
    online: null, // filled when --online
  };
});

// ---- integrity summaries ----
const missingSku = rows.filter((r) => !r.sku).map((r) => r.name);
const missingPrice = rows.filter((r) => r.priceStatus === 'unavailable').map((r) => r.name);
const missingImage = rows.filter((r) => r.sku && !r.imageExists).map((r) => `${r.name} (${r.sku})`);
const dupSkus = Object.entries(skuCount).filter(([, n]) => n > 1).map(([s, n]) => `${s} ×${n}`);
const missingUrl = rows.filter((r) => !r.officialUrl).map((r) => r.name);
const orphanImages = [...imgFiles].filter((s) => !Object.values(IMG).includes(s)); // image files no product uses

// ---- stale-price + cross-reference checks (report-only) ----
const staleSnapshots = rows.filter((r) => r.staleStatus === 'stale_snapshot').map((r) => r.name);
const needsReview = rows.filter((r) => r.staleStatus === 'needs_review').map((r) => r.name);
// Quiz can only add products whose exact name exists in the catalog (IMG/PRICES keys).
const catalogNames = new Set(Object.keys(IMG));
const quizRefsMissing = recommenderCatNames().filter((n) => !catalogNames.has(n));
// No "live price" wording in the price-rendering / catalog sources.
const livePriceHits = ['assets/explorer.js', 'assets/price-status.js']
  .filter((f) => fs.existsSync(path.join(ROOT, f)))
  .filter((f) => /\blive\s+prices?\b|\bprices?\s+live\b/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))
  .map((f) => `${f} contains "live price" wording`);

// ---- optional online candidate check (best-effort, honest) ----
async function checkOnline(r) {
  const res = { reachable: false, status: null, candidatePrice: null, priceConfidence: 'manual_review_required', imageCandidates: [], note: '' };
  if (!r.officialUrl) { res.note = 'no official URL'; return res; }
  try {
    const resp = await fetch(r.officialUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (audit; report-only)' }, redirect: 'follow' });
    res.status = resp.status;
    res.reachable = resp.ok;
    if (!resp.ok) { res.note = `HTTP ${resp.status}`; return res; }
    const html = await resp.text();
    // candidate prices: collect distinct $amounts; >1 distinct => ambiguous
    const money = [...new Set((html.match(/\$[0-9]{1,4}(?:\.[0-9]{2})?/g) || []))];
    if (money.length === 1) { res.candidatePrice = money[0]; res.priceConfidence = 'single_value_candidate'; }
    else if (money.length > 1) { res.priceConfidence = 'manual_review_required'; res.note = `multiple money values (${money.slice(0, 6).join(',')})`; }
    else { res.priceConfidence = 'manual_review_required'; res.note = 'no static price (likely JS-rendered)'; }
    // candidate product images (og:image / product image URLs)
    const og = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i);
    if (og) res.imageCandidates.push(og[1]);
    return res;
  } catch (e) { res.note = 'fetch error: ' + e.message; return res; }
}

if (ONLINE > 0) {
  const targets = rows.filter((r) => r.officialUrl).slice(0, ONLINE);
  for (let i = 0; i < targets.length; i += 5) {
    await Promise.all(targets.slice(i, i + 5).map(async (r) => { r.online = await checkOnline(r); }));
  }
}

// ---- write reports ----
const report = {
  generatedAt: new Date().toISOString(),
  mode: ONLINE > 0 ? `online (checked ${Math.min(ONLINE, rows.filter((r) => r.officialUrl).length)} URLs)` : 'local integrity only',
  DO_NOT_AUTO_PUBLISH: 'Candidate prices/images are advisory only. Never write them to the site without Luke’s manual verification.',
  counts: {
    productsInP: rows.length,
    imgKeys: Object.keys(IMG).length,
    priceKeys: Object.keys(PRICES).length,
    imageFilesOnDisk: imgFiles.size,
    setValues: Object.keys(VALUES).length,
  },
  issues: { missingSku, missingPrice, missingImage, duplicateSkus: dupSkus, missingOfficialUrl: missingUrl, orphanImageFiles: orphanImages },
  priceSafety: {
    snapshotStale,
    staleSnapshotCount: staleSnapshots.length,
    productsNeedingReview: needsReview,
    quizRecommendationRefsMissing: quizRefsMissing,
    livePriceWording: livePriceHits,
    note: 'Stale snapshots are flagged for human re-verification only. Prices are never changed automatically.',
  },
  products: rows,
};
fs.writeFileSync(path.join(OUT, 'latest-report.json'), JSON.stringify(report, null, 2));

const li = (arr) => (arr.length ? arr.map((x) => `  - ${x}`).join('\n') : '  - none');
const md = `# Cutco Product Audit — Report Only
_Generated: ${report.generatedAt}_ · _Mode: ${report.mode}_

> ⚠️ **DO NOT AUTO-PUBLISH.** Candidate prices/images below are advisory only.
> Cutco pages are JS-rendered — a single static price is rarely extractable. Never
> write a scraped price to the site. Verify manually, then use the approval flow.

## Counts
- Products in \`P\`: **${report.counts.productsInP}**
- \`IMG\` keys (SKUs): **${report.counts.imgKeys}**
- \`PRICES\` keys: **${report.counts.priceKeys}**
- Product image files on disk: **${report.counts.imageFilesOnDisk}**
- Set \`VALUES\`: **${report.counts.setValues}**

## Integrity issues
**Products with no SKU:**
${li(missingSku)}

**Products with no price (unavailable):**
${li(missingPrice)}

**SKUs with no local image file:**
${li(missingImage)}

**Duplicate SKUs:**
${li(dupSkus)}

**Products with no official Cutco URL:**
${li(missingUrl)}

**Orphan image files (on disk, no product uses them):**
${li(orphanImages)}

## Price safety (report-only — prices are NEVER changed automatically)
- Snapshot considered stale (June 2026 vs now): **${snapshotStale ? 'YES' : 'no'}**
- Products with a **stale_snapshot** price (re-verify against cutco.com): **${staleSnapshots.length}**
- Products marked **needs_review** (no price or no official URL): ${needsReview.length ? '\n' + li(needsReview) : '**0**'}
- Quiz recommendation names missing from the catalog (would fail to add): ${quizRefsMissing.length ? '\n' + li(quizRefsMissing) : '**0** ✅'}
- "live price" wording in price sources: ${livePriceHits.length ? '\n' + li(livePriceHits) : '**none** ✅'}

## Online candidate check
${ONLINE > 0
  ? rows.filter((r) => r.online).map((r) => `- **${r.name}** [${r.sku || '—'}] → ${r.online.reachable ? `reachable (HTTP ${r.online.status})` : `NOT reachable (${r.online.note})`} · price: ${r.online.candidatePrice || 'manual_review_required'}${r.online.note ? ` · _${r.online.note}_` : ''}`).join('\n')
  : '_Not run. Use `--online` to check official URLs (report-only)._'}

## Suggested changes (for Luke to review — NOT applied)
- Reconcile the **"79 pieces"** UI label with the real catalog count (**${report.counts.productsInP}**).
${missingImage.length ? '- Add missing product images (see list above), or remove those products.' : '- Product images: all SKUs have a local file. ✅'}
${missingPrice.length ? '- Decide price status for products with no price (mark needs_refresh / unavailable).' : '- Prices: every product has a snapshot price. ✅'}
- Re-verify snapshot prices against cutco.com before treating any as current.
`;
fs.writeFileSync(path.join(OUT, 'latest-report.md'), md);

console.log(`Audit complete → reports/cutco-audit/latest-report.{md,json}`);
console.log(`Products: ${report.counts.productsInP} | SKUs: ${report.counts.imgKeys} | images: ${report.counts.imageFilesOnDisk}`);
console.log(`Issues → noSKU:${missingSku.length} noPrice:${missingPrice.length} noImageFile:${missingImage.length} dupSKU:${dupSkus.length} noURL:${missingUrl.length} orphanImg:${orphanImages.length}`);
console.log(`Price safety → staleSnapshot:${staleSnapshots.length} needsReview:${needsReview.length} quizRefsMissing:${quizRefsMissing.length} livePriceWording:${livePriceHits.length}`);
if (ONLINE > 0) console.log(`Online: checked ${rows.filter((r) => r.online).length} URLs (candidates are advisory; nothing published)`);
