#!/usr/bin/env node
/*
 * scripts/sales-opportunity-report.mjs — REPORT ONLY.
 * Uses public/static data to surface conversion gaps and next actions:
 *   - pages missing a Book CTA / a "Text Luke" path / any strong final CTA
 *   - stale snapshot prices (June 2026 snapshot now older than the current month)
 *   - recommended next actions
 * No private customer data is read or committed. Writes
 * reports/automation/sales-opportunities.{md,json}.
 */
import { publicHtml, read, writeReport, li, reportHeader, loadCatalog, now } from './lib/audit-common.mjs';

// Pages where a hard Book/Text CTA is not necessarily expected.
const CTA_EXEMPT = new Set(['privacy', 'thanks', 'card', 'reviews', 'work']);

const rows = [];
for (const page of publicHtml()) {
  const html = read(`${page}.html`);
  const hasBook = /href="\/book"/.test(html) || /calendly\.com/.test(html);
  const hasText = /href="sms:/.test(html);
  // "final CTA" heuristic: a button/link in the last ~25% of the body.
  const body = html.slice(Math.floor(html.length * 0.75));
  const hasFinalCta = /class="[^"]*\bbtn\b[^"]*"/.test(body);
  rows.push({ page, hasBook, hasText, hasFinalCta, exempt: CTA_EXEMPT.has(page) });
}

const missingBook = rows.filter((r) => !r.hasBook && !r.exempt).map((r) => r.page);
const missingText = rows.filter((r) => !r.hasText && !r.exempt).map((r) => r.page);
const missingFinalCta = rows.filter((r) => !r.hasFinalCta && !r.exempt).map((r) => r.page);

// Stale snapshot prices from the catalog.
const { PRICES } = loadCatalog();
const priced = Object.keys(PRICES).filter((n) => PRICES[n]);
const nowD = now();
const snapshotStale = nowD.getUTCFullYear() > 2026 || (nowD.getUTCFullYear() === 2026 && nowD.getUTCMonth() + 1 > 6);
const staleCount = snapshotStale ? priced.length : 0;

const actions = [];
if (staleCount) actions.push(`Re-verify **${staleCount}** snapshot prices against cutco.com — the "June 2026 snapshot" is now older than the current month (mark verified or update the snapshot label, human-approved).`);
if (missingBook.length) actions.push(`Add a Book CTA to: ${missingBook.join(', ')}.`);
if (missingText.length) actions.push(`Add a "Text Luke" path to: ${missingText.join(', ')}.`);
if (missingFinalCta.length) actions.push(`Add a strong closing CTA near the bottom of: ${missingFinalCta.join(', ')}.`);
actions.push('Review pending reviews/referrals via `npm run digest:admin` (requires KV env; counts only).');
if (!actions.length) actions.push('No obvious conversion gaps found in the static scan. ✅');

const json = {
  generatedAt: new Date().toISOString(), reportOnly: true, containsPII: false,
  pages: rows, findings: { pagesMissingBookCta: missingBook, pagesMissingTextLuke: missingText, pagesMissingFinalCta: missingFinalCta, snapshotPricesStale: snapshotStale, stalePriceCount: staleCount },
  recommendedActions: actions,
};
const md = `${reportHeader('Sales-Opportunity Report — Report Only', 'Static analysis only — no private customer data is read or committed.')}
## Conversion coverage (public pages)
- Pages missing a Book CTA: **${missingBook.length}**
- Pages missing a "Text Luke" path: **${missingText.length}**
- Pages missing a strong closing CTA: **${missingFinalCta.length}**
- Snapshot prices stale (June 2026 vs now): **${snapshotStale ? `yes — ${staleCount} priced items` : 'no'}**

## Pages missing a Book CTA
${li(missingBook)}
## Pages missing a "Text Luke" path
${li(missingText)}
## Pages missing a strong closing CTA
${li(missingFinalCta)}

## Recommended next actions
${actions.map((a) => `  1. ${a}`).join('\n')}
`;
const out = writeReport('sales-opportunities', json, md);
console.log(`Sales report → ${out}`);
console.log(`PASS · missingBook:${missingBook.length} missingText:${missingText.length} stalePrices:${staleCount}`);
process.exitCode = 0; // advisory
