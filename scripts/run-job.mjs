#!/usr/bin/env node
/*
 * scripts/run-job.mjs — the Ops Agent runner.
 *
 * Usage:
 *   node scripts/run-job.mjs <job-id>            run one job (dry-run for mutating jobs)
 *   node scripts/run-job.mjs <job-id> --apply    run a mutating job for real (needs approval file)
 *   node scripts/run-job.mjs --list              list all jobs + risk levels
 *   node scripts/run-job.mjs --risk <level>      run all jobs of a risk level
 *   node scripts/run-job.mjs --all-safe          run all non-site-mutating jobs (safe_report + draft_only)
 *   node scripts/run-job.mjs --daily             run the daily set
 *   node scripts/run-job.mjs --weekly            run the weekly set
 *
 * NEVER pushes, deploys, prints secrets, or mutates the public site without an
 * approval file AND an explicit --apply on a single-job run.
 */
import { JOBS, RISK_LEVELS, getJob, jobsByRisk, jobsByTag } from '../ops/jobs/registry.mjs';
import { hasKvEnv, writeOpsReport, stamp } from '../ops/lib/ops-common.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const valOf = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const apply = flag('--apply');
const ctx = { apply, hasKv: hasKvEnv() };

const RISK_ICON = { safe_report: '🟢', draft_only: '🟡', approval_required: '🟠', admin_only: '🔴' };

function list() {
  console.log('\nOps Agent jobs (risk → id — title):\n');
  for (const level of RISK_LEVELS) {
    console.log(`${RISK_ICON[level]} ${level}`);
    for (const j of jobsByRisk(level)) console.log(`   ${j.id.padEnd(28)} ${j.title}`);
    console.log('');
  }
  console.log('Legend: 🟢 report-only  🟡 draft-only (writes ops/approvals)  🟠 approval-required (dry-run unless --apply)  🔴 admin-only (needs KV env)\n');
}

function selectJobs() {
  if (flag('--list')) return null;
  if (flag('--all-safe')) return JOBS.filter((j) => j.riskLevel === 'safe_report' || j.riskLevel === 'draft_only');
  if (flag('--daily')) return jobsByTag('daily');
  if (flag('--weekly')) return jobsByTag('weekly');
  if (flag('--risk')) { const lvl = valOf('--risk'); return jobsByRisk(lvl); }
  const id = argv.find((a) => !a.startsWith('--'));
  if (id) { const j = getJob(id); return j ? [j] : []; }
  return [];
}

async function main() {
  if (flag('--list') || argv.length === 0) { list(); return; }

  const jobs = selectJobs();
  if (!jobs || jobs.length === 0) { console.log('No matching job. Use --list to see options.'); process.exitCode = 1; return; }

  // In batch modes, never apply and never run approval/admin mutations implicitly.
  const batch = flag('--all-safe') || flag('--daily') || flag('--weekly');
  const results = [];
  console.log(`\n=== Ops Agent run — ${stamp()} ${apply && !batch ? '(APPLY mode)' : '(dry-run / report-only)'} ===\n`);

  for (const job of jobs) {
    // Safety gate: approval jobs never auto-apply in batch; admin jobs need KV.
    const runCtx = { ...ctx, apply: batch ? false : apply };
    if (job.riskLevel === 'admin_only' && !ctx.hasKv) { results.push({ job, r: { status: 'SKIP', summary: 'No KV env — skipped (safe).', outputs: [] } }); }
    else {
      try { const r = await job.run(runCtx); results.push({ job, r }); }
      catch (e) { results.push({ job, r: { status: 'FAIL', summary: 'job error: ' + e.message, outputs: [] } }); }
    }
    const last = results[results.length - 1];
    console.log(`  ${last.r.status.padEnd(4)} ${RISK_ICON[job.riskLevel]} ${job.id} — ${last.r.summary}`);
  }

  const tally = results.reduce((a, x) => (a[x.r.status] = (a[x.r.status] || 0) + 1, a), {});
  const fails = results.filter((x) => x.r.status === 'FAIL');
  const outputs = results.flatMap((x) => x.r.outputs || []);
  console.log(`\n  Totals: PASS ${tally.PASS || 0} · WARN ${tally.WARN || 0} · FAIL ${tally.FAIL || 0} · SKIP ${tally.SKIP || 0}`);
  if (outputs.length) console.log('  Drafts/reports written:\n' + outputs.map((o) => '   - ' + o).join('\n'));
  console.log('\n  (Ops Agent never pushes, deploys, prints secrets, or changes the public site without your approval.)');

  // Consolidated run report (gitignored).
  const md = `# Ops Agent Run\n_Generated: ${stamp()}_\n\n| Status | Risk | Job | Summary |\n|---|---|---|---|\n${results.map((x) => `| ${x.r.status} | ${x.job.riskLevel} | ${x.job.id} | ${(x.r.summary || '').replace(/\|/g, '/')} |`).join('\n')}\n\nTotals: PASS ${tally.PASS || 0} · WARN ${tally.WARN || 0} · FAIL ${tally.FAIL || 0} · SKIP ${tally.SKIP || 0}\n`;
  const out = writeOpsReport('last-run.md', md);
  console.log('  Run log → ' + out);
  process.exitCode = fails.length ? 1 : 0;
}

main();
