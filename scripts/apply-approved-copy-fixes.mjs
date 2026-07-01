#!/usr/bin/env node
/*
 * scripts/apply-approved-copy-fixes.mjs — APPROVAL REQUIRED. Dry-run by default.
 *
 * Applies ONLY exact-string copy swaps that are explicitly approved in
 * ops/approvals/approved-copy-fixes.json. Every entry must have approved:true, a
 * target file, a unique `find` string, and a `replace`. Refuses ambiguous matches.
 * Backs up each file before writing. Never invents copy, never touches prices.
 *
 *   node scripts/apply-approved-copy-fixes.mjs          # dry-run (diff only)
 *   node scripts/apply-approved-copy-fixes.mjs --apply  # write (backup first)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const FILE = path.join(ROOT, 'ops', 'approvals', 'approved-copy-fixes.json');

if (!fs.existsSync(FILE)) {
  console.error('No approved-copy-fixes.json found in ops/approvals/. Copy approved-copy-fixes.example.json and fill it in first.');
  process.exit(1);
}

let entries;
try { entries = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
catch (e) { console.error('approved-copy-fixes.json is not valid JSON:', e.message); process.exit(1); }
if (!Array.isArray(entries)) { console.error('approved-copy-fixes.json must be an array.'); process.exit(1); }

// Never allow touching secrets / config / unrelated areas.
const BLOCKED = /^(\.|node_modules\/|api\/|\.github\/|package|sw\.js|reports\/|ops\/)/;

let applied = 0, skipped = 0;
for (const e of entries) {
  const label = `${e.file || '?'}`;
  if (e.approved !== true) { console.log(`SKIP  ${label} — not approved (approved:true required)`); skipped++; continue; }
  if (!e.file || typeof e.find !== 'string' || typeof e.replace !== 'string') { console.log(`SKIP  ${label} — needs file + find + replace strings`); skipped++; continue; }
  if (BLOCKED.test(e.file) || !/\.(html|css|js)$/.test(e.file)) { console.log(`SKIP  ${label} — file not allowed for copy fixes`); skipped++; continue; }
  const abs = path.join(ROOT, e.file);
  if (!fs.existsSync(abs)) { console.log(`SKIP  ${label} — file not found`); skipped++; continue; }
  const src = fs.readFileSync(abs, 'utf8');
  const count = src.split(e.find).length - 1;
  if (count === 0) { console.log(`SKIP  ${label} — find string not present`); skipped++; continue; }
  if (count > 1) { console.log(`SKIP  ${label} — find string is ambiguous (${count} matches); make it unique`); skipped++; continue; }
  // Refuse changes that introduce disallowed wording.
  if (/\blive\s+prices?\b|\bguaranteed\s+(price|best)\b|\bmust\s+buy\b/i.test(e.replace)) { console.log(`SKIP  ${label} — replacement contains disallowed wording`); skipped++; continue; }
  console.log(`${APPLY ? 'APPLY' : 'DRY  '} ${label}\n    - ${JSON.stringify(e.find.slice(0, 80))}\n    + ${JSON.stringify(e.replace.slice(0, 80))}`);
  if (APPLY) {
    fs.copyFileSync(abs, abs + '.bak');
    fs.writeFileSync(abs, src.replace(e.find, e.replace));
  }
  applied++;
}

console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${applied} fix(es); skipped ${skipped}.`);
if (!APPLY) console.log('DRY RUN — nothing written. Re-run with --apply to write (a .bak backup is made first).');
if (APPLY && applied) console.log('Remember: CSS/JS/HTML changed → bump sw.js CACHE, run npm run preflight, and review before push.');
