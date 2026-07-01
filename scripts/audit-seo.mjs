#!/usr/bin/env node
/*
 * scripts/audit-seo.mjs — REPORT ONLY.
 * Checks each public page for title, meta description, canonical, Open Graph,
 * Twitter card, exactly one <h1>, sitemap inclusion, robots.txt, accidental
 * noindex, duplicate meta descriptions across town pages, and schema presence.
 * Never edits pages. Writes reports/automation/seo-audit.{md,json}.
 */
import { publicHtml, read, exists, writeReport, li, reportHeader } from './lib/audit-common.mjs';

const pick = (html, re) => { const m = html.match(re); return m ? (m[1] || '').trim() : ''; };
const has = (html, re) => re.test(html);

const sitemap = exists('sitemap.xml') ? read('sitemap.xml') : '';
const robots = exists('robots.txt');
const TOWNS = ['north-shore-cutco', 'winnetka-cutco', 'glencoe-cutco', 'northbrook-cutco', 'evanston-cutco', 'depauw-cutco'];

const rows = [];
const descByText = {};
for (const page of publicHtml()) {
  const html = read(`${page}.html`);
  const title = pick(html, /<title>([^<]*)<\/title>/i);
  const desc = pick(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const canonical = pick(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  const h1s = (html.match(/<h1\b/gi) || []).length;
  const r = {
    page,
    title: !!title, titleLen: title.length,
    description: !!desc, descLen: desc.length,
    canonical: !!canonical,
    ogTitle: has(html, /property=["']og:title["']/i),
    ogDesc: has(html, /property=["']og:description["']/i),
    ogImage: has(html, /property=["']og:image["']/i),
    twitter: has(html, /name=["']twitter:card["']/i),
    h1Count: h1s,
    noindex: /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html),
    inSitemap: sitemap.includes(`/${page === 'index' ? '' : page}`) || (page === 'index' && (sitemap.includes('<loc>') )),
    hasFaqSchema: /FAQPage/.test(html),
    hasPersonOrSiteSchema: /"@type":\s*"(Person|WebSite|LocalBusiness|Organization)"/.test(html),
  };
  if (desc) (descByText[desc] = descByText[desc] || []).push(page);
  rows.push(r);
}

// Findings
const missTitle = rows.filter((r) => !r.title).map((r) => r.page);
const missDesc = rows.filter((r) => !r.description).map((r) => r.page);
const missCanon = rows.filter((r) => !r.canonical).map((r) => r.page);
const missOg = rows.filter((r) => !(r.ogTitle && r.ogDesc && r.ogImage)).map((r) => r.page);
const badH1 = rows.filter((r) => r.h1Count !== 1).map((r) => `${r.page} (${r.h1Count} h1)`);
const accidentalNoindex = rows.filter((r) => r.noindex).map((r) => r.page);
const notInSitemap = rows.filter((r) => !r.inSitemap).map((r) => r.page);
const dupDesc = Object.entries(descByText).filter(([, ps]) => ps.length > 1).map(([, ps]) => ps.join(' = '));
const townDupDesc = dupDesc.filter((s) => TOWNS.some((t) => s.includes(t)));

const warnings = missDesc.length + missCanon.length + missOg.length + badH1.length + accidentalNoindex.length + townDupDesc.length;
const json = {
  generatedAt: new Date().toISOString(), reportOnly: true, robotsTxtExists: robots,
  pages: rows, findings: { missingTitle: missTitle, missingDescription: missDesc, missingCanonical: missCanon, weakOpenGraph: missOg, h1Issues: badH1, accidentalNoindex, notInSitemap, duplicateMetaDescriptions: dupDesc, townPagesWithDuplicateDescription: townDupDesc },
};
const md = `${reportHeader('SEO / Local-Search Audit — Report Only')}
## Summary
- Pages scanned: **${rows.length}** · robots.txt: **${robots ? 'present' : 'MISSING'}** · sitemap.xml: **${sitemap ? 'present' : 'MISSING'}**
- Missing title: **${missTitle.length}** · missing description: **${missDesc.length}** · missing canonical: **${missCanon.length}**
- Weak Open Graph: **${missOg.length}** · h1 issues: **${badH1.length}** · accidental noindex: **${accidentalNoindex.length}**
- Duplicate meta descriptions: **${dupDesc.length}** (town pages: ${townDupDesc.length})

## Missing meta description
${li(missDesc)}
## Missing canonical
${li(missCanon)}
## Weak / incomplete Open Graph (need og:title+description+image)
${li(missOg)}
## H1 issues (want exactly one)
${li(badH1)}
## Accidental noindex on public pages
${li(accidentalNoindex)}
## Pages not found in sitemap.xml (advisory)
${li(notInSitemap)}
## Town pages sharing a meta description (make each unique)
${li(townDupDesc)}
`;
const out = writeReport('seo-audit', json, md);
console.log(`SEO audit → ${out}`);
console.log(`${missTitle.length ? 'FAIL' : 'PASS'} · missingTitle:${missTitle.length} missingDesc:${missDesc.length} weakOG:${missOg.length} h1Issues:${badH1.length} warnings:${warnings}`);
process.exitCode = missTitle.length ? 1 : 0; // only missing <title> is a hard fail
