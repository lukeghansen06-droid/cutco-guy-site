#!/usr/bin/env node
/*
 * scripts/audit-events.mjs — REPORT ONLY.
 * Verifies major conversion CTAs are tracked via the data-ev -> /api/track pattern.
 * Checks a curated set of important events are present in the shipped HTML/JS, and
 * flags book/text CTAs that lack a data-ev (advisory — not every link needs one).
 * Writes reports/automation/event-audit.{md,json}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, publicHtml, read, writeReport, li, reportHeader } from './lib/audit-common.mjs';

// Gather all shipped html + assets js into one searchable blob.
const jsFiles = fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => f.endsWith('.js')).map((f) => `assets/${f}`);
const htmlFiles = publicHtml().map((p) => `${p}.html`);
const blob = [...htmlFiles, ...jsFiles].map((f) => read(f)).join('\n');

// Curated important events grouped by area. Presence = tracked somewhere.
const EXPECTED = {
  'Book CTAs': ['book_full_click', 'book_quick_click', 'hero_book_click', 'mobile_sticky_book_click'],
  'Finder / quiz': ['find_quiz_start', 'find_quiz_complete', 'find_quiz_reset', 'find_quiz_send_to_luke', 'book_with_result_click', 'quiz_add_product_to_list', 'perfect_match_seen'],
  'Assistant': ['assistant_open', 'assistant_message_send', 'assistant_quick_chip_click', 'assistant_start_finder_click', 'assistant_book_click', 'assistant_text_luke_click', 'assistant_price_check_click'],
  'Explorer / My List': ['explorer_add_to_list', 'my_list_open', 'my_list_text_luke', 'my_list_clear'],
  'Pricing / official': ['price_check_text_luke', 'official_cutco_link_click', 'knife_audit_text_luke'],
  'Lanes / referral': ['gift_finder_click', 'owner_service_click', 'path_gift', 'path_owner', 'path_referred', 'referral_copy_intro'],
};

const present = {}, missing = [];
for (const [group, evs] of Object.entries(EXPECTED)) {
  present[group] = {};
  for (const ev of evs) {
    const ok = blob.includes(`'${ev}'`) || blob.includes(`"${ev}"`) || blob.includes(`data-ev="${ev}"`);
    present[group][ev] = ok;
    if (!ok) missing.push(`${group}: ${ev}`);
  }
}

// Advisory: book/sms CTAs in public HTML without any data-ev on the same tag.
const uncoveredCtas = [];
for (const page of publicHtml()) {
  const html = read(`${page}.html`);
  const anchors = html.match(/<a\b[^>]*>/gi) || [];
  for (const a of anchors) {
    const isCta = /href="\/book"/.test(a) || /href="sms:/.test(a);
    if (isCta && !/data-ev=/.test(a)) uncoveredCtas.push(`${page}.html → ${a.slice(0, 90).replace(/\s+/g, ' ')}…`);
  }
}

const json = {
  generatedAt: new Date().toISOString(), reportOnly: true,
  expectedEventsPresent: present, missingEvents: missing, majorCtasWithoutDataEv: uncoveredCtas,
};
const md = `${reportHeader('Analytics / Event-Coverage Audit — Report Only')}
## Summary
- Curated events checked: **${Object.values(EXPECTED).flat().length}** · missing: **${missing.length}**
- Book/Text CTAs in public HTML without data-ev (advisory): **${uncoveredCtas.length}**

## Missing important events
${li(missing)}

${Object.entries(present).map(([g, evs]) => `## ${g}\n${Object.entries(evs).map(([e, ok]) => `  - ${ok ? '✅' : '❌'} ${e}`).join('\n')}`).join('\n\n')}

## Book/Text CTAs without data-ev (advisory — not every link needs one)
${li(uncoveredCtas)}
`;
const out = writeReport('event-audit', json, md);
console.log(`Event audit → ${out}`);
console.log(`${missing.length ? 'WARN' : 'PASS'} · missingEvents:${missing.length} uncoveredMajorCtas:${uncoveredCtas.length}`);
process.exitCode = 0; // event coverage is advisory — never hard-fail
