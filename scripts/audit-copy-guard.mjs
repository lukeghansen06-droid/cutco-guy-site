#!/usr/bin/env node
/*
 * scripts/audit-copy-guard.mjs — REPORT ONLY.
 * Scans shipped public files (html + assets/*.{js,css}) for low-trust / misleading
 * wording: fake "live/guaranteed" pricing, fake urgency, placeholder/fake reviews.
 * Ignores _old-singlepage/ (gitignored, not deployed) and generated reports.
 * Writes reports/automation/copy-guard.{md,json}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, publicHtml, read, writeReport, li, reportHeader } from './lib/audit-common.mjs';

// Each rule: label + regex. Word-boundaried where sensible to avoid false hits.
const RULES = [
  ['live price wording', /\blive\s+prices?\b|\bprices?\s+live\b/i],
  ['guaranteed price/best', /\bguaranteed\s+(price|best)\b/i],
  ['"must buy"', /\bmust\s+buy\b/i],
  ['"you need this"', /\byou\s+need\s+this\b/i],
  ['"estimated price/total"', /\bestimated\s+(price|total)\b/i],
  ['"about $<n>" vague price', /\babout\s+\$\s?\d/i],
  ['lorem ipsum placeholder', /lorem\s+ipsum/i],
  ['placeholder name (John/Jane Doe)', /\b(john|jane)\s+doe\b/i],
  ['fake urgency: "only today"', /\bonly\s+today\b/i],
  ['fake urgency: "limited spots"', /\blimited\s+spots\b/i],
  ['fake urgency: "act now"', /\bact\s+now\b/i],
  ['fake urgency: "hurry"', /\bhurry\b/i],
];

// Allowed phrases that may otherwise trip a rule — never counted as violations.
const ALLOWED = [
  'confirm current price', 'june 2026 snapshot', 'july 2026 manual verification',
  'ask luke to confirm price', 'view official cutco page', 'smart starting point',
];

// Public source files (html + assets js/css). Exclude admin dashboards + archived page.
const files = [
  ...publicHtml().map((p) => `${p}.html`),
  ...fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => `assets/${f}`),
];

const findings = [];
for (const rel of files) {
  const src = read(rel);
  const lines = src.split('\n');
  for (const [label, re] of RULES) {
    lines.forEach((line, i) => {
      const m = line.match(new RegExp(re.source, 'gi'));
      if (!m) return;
      // Keep only matches that aren't part of an allowed phrase.
      const realHits = m.filter((hit) => !ALLOWED.some((a) => a.includes(hit.toLowerCase())));
      if (realHits.length) findings.push({ file: rel, line: i + 1, rule: label, text: line.trim().slice(0, 140) });
    });
  }
}

const json = { generatedAt: new Date().toISOString(), reportOnly: true, filesScanned: files.length, violations: findings, allowedPhrases: ALLOWED };
const md = `${reportHeader('Copy / Trust Guard — Report Only', 'Scans shipped public files only. _old-singlepage/ (gitignored) is excluded.')}
## Summary
- Files scanned: **${files.length}**
- Violations: **${findings.length}**

## Violations
${findings.length ? findings.map((f) => `  - **${f.rule}** — \`${f.file}:${f.line}\` — ${f.text}`).join('\n') : '  - none ✅'}

## Allowed (never flagged)
${li(ALLOWED)}
`;
const out = writeReport('copy-guard', json, md);
console.log(`Copy guard → ${out}`);
console.log(`${findings.length ? 'FAIL' : 'PASS'} · violations:${findings.length} filesScanned:${files.length}`);
process.exitCode = findings.length ? 1 : 0;
