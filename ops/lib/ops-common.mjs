/*
 * ops/lib/ops-common.mjs — shared helpers for the Ops Agent jobs.
 * Read-only utilities + safe report/approval writers. Reuses the automation lib.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as common from '../../scripts/lib/audit-common.mjs';

export const { ROOT, read, exists, publicHtml, allHtml, loadCatalog, now, li, recommenderCatNames } = common;

export const OPS_REPORTS = path.join(ROOT, 'ops', 'reports');   // gitignored
export const APPROVALS = path.join(ROOT, 'ops', 'approvals');   // examples/README committable; drafts gitignored

export function relOf(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }
export function writeOpsReport(name, content) { fs.mkdirSync(OPS_REPORTS, { recursive: true }); const p = path.join(OPS_REPORTS, name); fs.writeFileSync(p, content); return relOf(p); }
export function writeApproval(name, content) { fs.mkdirSync(APPROVALS, { recursive: true }); const p = path.join(APPROVALS, name); fs.writeFileSync(p, content); return relOf(p); }

/** Run an existing report-only script; returns {code, out, lastLine}. Never throws. */
export function runScript(rel, args = '') {
  try {
    const out = execSync(`node "${path.join(ROOT, rel)}" ${args}`.trim(), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    return { code: 0, out, lastLine: (out.trim().split('\n').pop() || '') };
  } catch (e) {
    const out = ((e.stdout || '') + (e.stderr || '')).toString();
    return { code: e.status || 1, out, lastLine: (out.trim().split('\n').pop() || '') };
  }
}

export function hasKvEnv() { return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }
export function stamp() { return new Date().toISOString(); }

/** Read a generated automation report JSON if present (else null). */
export function readAutomationJson(slug) {
  try { return JSON.parse(read(`reports/automation/${slug}.json`)); } catch { return null; }
}
export function readCutcoAudit() {
  try { return JSON.parse(read('reports/cutco-audit/latest-report.json')); } catch { return null; }
}
