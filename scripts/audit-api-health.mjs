#!/usr/bin/env node
/*
 * scripts/audit-api-health.mjs — REPORT ONLY.
 * Static checks on the serverless functions in /api (no network, no fake leads):
 *   - required files exist
 *   - each parses (node --check)
 *   - KV is imported lazily (inside the handler) so a missing-KV env can't crash
 *     module load, and there is a try/catch around KV usage
 *   - handlers export a default function
 * Writes reports/automation/api-health.{md,json}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, exists, read, writeReport, li, reportHeader } from './lib/audit-common.mjs';

const REQUIRED = ['api/lead.js', 'api/reviews.js', 'api/track.js'];
const OPTIONAL = ['api/leads.js'];

function nodeCheck(rel) {
  try { execSync(`node --check "${path.join(ROOT, rel)}"`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

const rows = [];
const missing = [];
for (const rel of [...REQUIRED, ...OPTIONAL]) {
  if (!exists(rel)) { if (REQUIRED.includes(rel)) missing.push(rel); continue; }
  const src = read(rel);
  const importsKv = /@vercel\/kv/.test(src);
  const kvTopLevelImport = /^\s*import\s+[^;]*@vercel\/kv/m.test(src);
  const kvLazy = /await\s+import\(['"]@vercel\/kv['"]\)/.test(src) || /require\(['"]@vercel\/kv['"]\)/.test(src);
  const hasTryCatch = /try\s*\{[\s\S]*catch/.test(src);
  const hasDefaultExport = /export\s+default/.test(src);
  rows.push({
    file: rel,
    parses: nodeCheck(rel),
    usesKv: importsKv,
    kvLazyLoaded: kvLazy || !kvTopLevelImport, // lazy import OR no static import = safe module load
    guardedWithTryCatch: hasTryCatch,
    hasDefaultExport,
  });
}

const parseFails = rows.filter((r) => !r.parses).map((r) => r.file);
const noDefault = rows.filter((r) => !r.hasDefaultExport).map((r) => r.file);
const kvNotGuarded = rows.filter((r) => r.usesKv && !r.guardedWithTryCatch).map((r) => r.file);
const kvEagerLoad = rows.filter((r) => r.usesKv && !r.kvLazyLoaded).map((r) => r.file);

const hardFail = missing.length + parseFails.length;
const json = {
  generatedAt: new Date().toISOString(), reportOnly: true,
  missingRequiredFiles: missing, functions: rows,
  findings: { parseFailures: parseFails, missingDefaultExport: noDefault, kvUsageNotTryCaught: kvNotGuarded, kvImportedEagerly: kvEagerLoad },
  note: 'Static analysis only. No production form was pinged; no fake lead/review was submitted.',
};
const md = `${reportHeader('Form / API Health — Report Only', 'Static analysis only — no production forms pinged, no fake data submitted.')}
## Summary
- Required files present: **${REQUIRED.filter(exists).length}/${REQUIRED.length}** · missing: **${missing.length}**
- Parse failures: **${parseFails.length}** · missing default export: **${noDefault.length}**
- KV used without try/catch: **${kvNotGuarded.length}** · KV imported eagerly (can crash on missing env): **${kvEagerLoad.length}**

## Functions
${rows.map((r) => `  - \`${r.file}\` — parses:${r.parses ? '✅' : '❌'} · kv:${r.usesKv ? 'yes' : 'no'} · kvLazy:${r.kvLazyLoaded ? '✅' : '⚠️'} · try/catch:${r.guardedWithTryCatch ? '✅' : '⚠️'} · default export:${r.hasDefaultExport ? '✅' : '❌'}`).join('\n')}

## Missing required files
${li(missing)}
## Parse failures
${li(parseFails)}
`;
const out = writeReport('api-health', json, md);
console.log(`API health → ${out}`);
console.log(`${hardFail ? 'FAIL' : 'PASS'} · missing:${missing.length} parseFails:${parseFails.length} kvEager:${kvEagerLoad.length} kvUnguarded:${kvNotGuarded.length}`);
process.exitCode = hardFail ? 1 : 0;
