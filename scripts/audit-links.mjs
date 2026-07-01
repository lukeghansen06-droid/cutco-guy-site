#!/usr/bin/env node
/*
 * scripts/audit-links.mjs — REPORT ONLY.
 * Parses every public .html page, collects internal routes, and verifies each
 * resolves to a real page file (Vercel cleanUrls: /book -> book.html, / -> index).
 * Ignores mailto:/tel:/sms:/external links. Flags links to _old-singlepage/ and
 * checks local-SEO town pages are discoverable (footer or sitemap).
 * Never edits anything. Writes reports/automation/link-audit.{md,json}.
 */
import { ROOT, allHtml, publicHtml, read, exists, internalHrefs, writeReport, li, reportHeader } from './lib/audit-common.mjs';

const pageSet = new Set([...allHtml(), '']); // '' == "/"
const TOWN_PAGES = ['north-shore-cutco', 'winnetka-cutco', 'glencoe-cutco', 'northbrook-cutco', 'evanston-cutco', 'depauw-cutco'];

const broken = [];      // {page, href}
const oldLinks = [];    // links into _old-singlepage
const perPage = {};

for (const page of publicHtml()) {
  const html = read(`${page}.html`);
  const hrefs = [...new Set(internalHrefs(html))];
  perPage[page] = hrefs;
  for (const h of hrefs) {
    const key = h.replace(/^\//, '');
    if (!pageSet.has(key)) broken.push(`${page}.html → ${h}`);
  }
  if (/_old-singlepage/.test(html)) oldLinks.push(`${page}.html links to _old-singlepage/`);
}

// Are the town/local-SEO pages discoverable? (linked from any page or in sitemap)
const sitemap = exists('sitemap.xml') ? read('sitemap.xml') : '';
const allLinked = new Set(Object.values(perPage).flat().map((h) => h.replace(/^\//, '')));
const orphanTowns = TOWN_PAGES.filter((t) => exists(`${t}.html`) && !allLinked.has(t) && !sitemap.includes(`/${t}`));

const pass = broken.length === 0 && oldLinks.length === 0;
const json = {
  generatedAt: new Date().toISOString(), reportOnly: true,
  pagesScanned: publicHtml().length,
  brokenInternalLinks: broken,
  linksToArchivedSinglePage: oldLinks,
  townPagesNotDiscoverable: orphanTowns,
  sitemapExists: !!sitemap,
};
const md = `${reportHeader('Link / Route Audit — Report Only')}
## Summary
- Pages scanned: **${json.pagesScanned}**
- Broken internal links: **${broken.length}**
- Links into \`_old-singlepage/\`: **${oldLinks.length}**
- Town pages not discoverable (footer/sitemap): **${orphanTowns.length}**

## Broken internal links
${li(broken)}

## Links into archived _old-singlepage/ (should be none)
${li(oldLinks)}

## Local-SEO town pages not linked or in sitemap (advisory)
${li(orphanTowns)}
`;
const out = writeReport('link-audit', json, md);
console.log(`Link audit → ${out}`);
console.log(`${pass ? 'PASS' : 'FAIL'} · broken:${broken.length} oldSinglepageLinks:${oldLinks.length} orphanTowns:${orphanTowns.length}`);
process.exitCode = broken.length ? 1 : 0; // orphan towns = warning only
