#!/usr/bin/env node
/*
 * scripts/preflight.mjs — REPORT ONLY. The master pre-push gate.
 * Runs the test suite + every report-only audit, plus a few direct checks, and
 * prints a PASS/FAIL summary with a "safe to push?" recommendation.
 * It NEVER pushes, deploys, or modifies prices/content.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { ROOT, read, git, exists } from './lib/audit-common.mjs';

const results = [];
const add = (name, status, detail = '') => results.push({ name, status, detail });

function run(cmd) {
  try { return { code: 0, out: execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }; }
  catch (e) { return { code: e.status || 1, out: ((e.stdout || '') + (e.stderr || '')).toString() }; }
}
function bunCmd() {
  const candidates = ['bun', `${process.env.USERPROFILE || process.env.HOME || ''}/.bun/bin/bun.exe`, `${process.env.HOME || ''}/.bun/bin/bun`];
  for (const c of candidates) { try { execSync(`"${c}" --version`, { stdio: 'ignore' }); return c; } catch {} }
  return null;
}

// 1) Tests
const bun = bunCmd();
if (bun) { const r = run(`"${bun}" test 2>&1`); add('bun test', r.code === 0 && /\bpass\b/.test(r.out) && !/[1-9]\d* fail/.test(r.out) ? 'PASS' : 'FAIL', (r.out.match(/\d+ pass|\d+ fail/g) || []).join(' ')); }
else add('bun test', 'WARN', 'bun not found in this environment — run `bun test` in VS Code/CI');

// 2) Report-only audits (exit code: non-zero = hard fail; 0 = pass/warn)
const audits = [
  ['audit:cutco', 'node scripts/audit-cutco-products.mjs'],
  ['audit:links', 'node scripts/audit-links.mjs'],
  ['audit:seo', 'node scripts/audit-seo.mjs'],
  ['audit:events', 'node scripts/audit-events.mjs'],
  ['audit:copy', 'node scripts/audit-copy-guard.mjs'],
  ['check:cache', 'node scripts/check-cache-bump.mjs'],
  ['audit:api', 'node scripts/audit-api-health.mjs'],
];
for (const [name, cmd] of audits) {
  const r = run(cmd);
  const last = r.out.trim().split('\n').pop() || '';
  add(name, r.code === 0 ? (/\bWARN\b/.test(r.out) ? 'WARN' : 'PASS') : 'FAIL', last.slice(0, 120));
}

// 3) Direct checks
// product count == 89
try {
  const rep = JSON.parse(read('reports/cutco-audit/latest-report.json'));
  add('product count = 89', rep.counts.productsInP === 89 && rep.counts.imgKeys === 89 && rep.counts.imageFilesOnDisk === 89 ? 'PASS' : 'FAIL', `products:${rep.counts.productsInP} img:${rep.counts.imageFilesOnDisk}`);
} catch { add('product count = 89', 'WARN', 'run audit:cutco first'); }

// sw cache present
const cache = (read('sw.js').match(/const CACHE\s*=\s*['"]([^'"]+)['"]/) || [])[1];
add('sw.js CACHE present', cache ? 'PASS' : 'FAIL', cache || 'not found');

// generated reports are gitignored
const ignored = ['reports/automation/x.md', 'reports/cutco-audit/latest-report.json'].every((p) => git(`check-ignore ${p}`));
add('generated reports gitignored', ignored ? 'PASS' : 'WARN', ignored ? '' : 'add reports/automation/* + reports/cutco-audit/latest* to .gitignore');

// no forbidden files staged
const staged = (git('diff --cached --name-only') || '').split('\n').map((s) => s.trim()).filter(Boolean);
const FORBIDDEN = ['CLAUDE_CAPABILITY_PROFILE.md', 'CURRENT_CUTCO_HANDOFF.md'];
const badStaged = staged.filter((f) => FORBIDDEN.includes(f) || /^reports\/(automation|cutco-audit)\/.*\.(json|md)$/.test(f));
add('no forbidden staged files', badStaged.length ? 'FAIL' : 'PASS', badStaged.join(', '));

// ---- summary ----
const counts = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
const fails = results.filter((r) => r.status === 'FAIL');
const safe = fails.length === 0;
console.log('\n=== PREFLIGHT — report only, nothing changed ===');
for (const r of results) console.log(`  ${r.status.padEnd(4)} ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
console.log(`\n  Totals: PASS ${counts.PASS || 0} · WARN ${counts.WARN || 0} · FAIL ${counts.FAIL || 0}`);
if (fails.length) console.log('  Review: ' + fails.map((f) => f.name).join(', '));
console.log(`\n  SAFE TO PUSH? ${safe ? 'YES — checks pass. (Still requires Luke to say "push".)' : 'NO — resolve the FAIL items above first.'}`);
console.log('  (Preflight never pushes, deploys, or changes prices.)');
process.exitCode = safe ? 0 : 1;
