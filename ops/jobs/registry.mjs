/*
 * ops/jobs/registry.mjs — the Ops Agent job registry (single source of truth).
 *
 * Every job declares its permissions and risk level. The runner (scripts/run-job.mjs)
 * enforces them: nothing mutates the public site without an approval file AND --apply,
 * admin jobs run only when KV env is present, and nothing ever pushes/deploys.
 *
 * riskLevel: 'safe_report' | 'draft_only' | 'approval_required' | 'admin_only'
 */
import { loadCatalog, publicHtml, read, now, li, runScript, writeApproval, readAutomationJson, readCutcoAudit, stamp } from '../lib/ops-common.mjs';

const statusFrom = (r) => (r.code !== 0 ? 'FAIL' : (/\bWARN\b/.test(r.out) ? 'WARN' : 'PASS'));

/** A safe_report job that just runs an existing report-only script. */
function scriptJob(id, title, description, rel, tags = []) {
  return {
    id, title, description, riskLevel: 'safe_report',
    canRead: true, canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false,
    tags,
    async run() { const r = runScript(rel); return { status: statusFrom(r), summary: r.lastLine || `${rel} done`, outputs: [] }; },
  };
}

export const JOBS = [
  // ---------------- SAFE REPORT ----------------
  scriptJob('product-health', 'Product / photo / price health', 'Catalog integrity: 89 products/SKUs/images, dup SKUs, orphan images, missing URLs, price status, stale snapshots, quiz refs.', 'scripts/audit-cutco-products.mjs', ['daily', 'weekly']),
  {
    id: 'price-staleness', title: 'Price staleness', description: 'Flags June-2026 snapshots as stale vs the current month; lists needs_review / unavailable. Never changes prices.',
    riskLevel: 'safe_report', canRead: true, canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['daily', 'weekly'],
    async run() {
      const r = runScript('scripts/audit-cutco-products.mjs');
      const rep = readCutcoAudit();
      const ps = rep && rep.priceSafety;
      const summary = ps ? `stale_snapshot:${ps.staleSnapshotCount} needsReview:${ps.productsNeedingReview.length} quizRefsMissing:${ps.quizRecommendationRefsMissing.length}` : (r.lastLine || 'no report');
      return { status: r.code === 0 ? (ps && ps.staleSnapshotCount ? 'WARN' : 'PASS') : 'FAIL', summary, outputs: [] };
    },
  },
  scriptJob('link-health', 'Link / route health', 'Every internal link resolves; no links into _old-singlepage; town pages discoverable.', 'scripts/audit-links.mjs', ['daily', 'weekly']),
  scriptJob('seo-health', 'SEO / local-search health', 'Title/description/canonical/OG/h1/sitemap per public page.', 'scripts/audit-seo.mjs', ['weekly']),
  scriptJob('event-coverage', 'Analytics event coverage', 'Major conversion CTAs are tracked via data-ev.', 'scripts/audit-events.mjs', ['weekly']),
  scriptJob('copy-trust-guard', 'Copy / trust guard', 'Scans shipped files for low-trust wording (live price, fake urgency, placeholders).', 'scripts/audit-copy-guard.mjs', ['daily', 'weekly']),
  scriptJob('api-health', 'Form / API health', 'Serverless functions parse and degrade gracefully without KV.', 'scripts/audit-api-health.mjs', ['weekly']),
  scriptJob('cache-bump-check', 'Service-worker cache-bump check', 'Warns if CSS/JS changed but sw.js CACHE was not bumped.', 'scripts/check-cache-bump.mjs', ['daily', 'weekly']),
  scriptJob('sales-opportunities', 'Sales-opportunity report', 'Pages missing Book/Text CTAs, weak closers, stale-price opportunities, next actions.', 'scripts/sales-opportunity-report.mjs', ['weekly']),
  {
    id: 'full-preflight', title: 'Full preflight', description: 'Runs bun test + preflight (which runs every audit) and reports safe-to-push.',
    riskLevel: 'safe_report', canRead: true, canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['weekly'],
    async run() { const r = runScript('scripts/preflight.mjs'); const line = (r.out.match(/SAFE TO PUSH\?[^\n]*/) || [r.lastLine])[0]; return { status: statusFrom(r), summary: line, outputs: [] }; },
  },

  // ---------------- DRAFT ONLY (writes to ops/approvals/, never applies) ----------------
  {
    id: 'draft-july-price-review', title: 'Draft: July price-review checklist', description: 'Builds a manual re-verification checklist (with official URLs) for stale snapshot prices. Changes nothing.',
    riskLevel: 'draft_only', canRead: true, canWrite: 'approvals', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['weekly'],
    async run() {
      const { P, PRICES } = loadCatalog();
      const priced = P.filter((p) => PRICES[p.n]);
      const md = `# July 2026 — Manual Price Re-Verification Checklist
_Generated: ${stamp()} — DRAFT. Nothing changed. Prices are never auto-updated._

The June 2026 snapshot is now older than the current month. Re-verify each price on
cutco.com, then (only if you choose to) record it in \`ops/approvals/approved-updates.json\`
with \`approved: true\` and run \`npm run ops:price-review\` → apply flow.

| ✓ | Product | SKU | Snapshot | Official URL | Verified price | New label |
|---|---------|-----|----------|--------------|----------------|-----------|
${priced.map((p) => `| ☐ | ${p.n} | ${p.sku || '—'} | ${PRICES[p.n]} | ${p.u || '—'} | ________ | July 2026 manual verification |`).join('\n')}

**${priced.length}** products to check. Do not change any price without confirming it on cutco.com first.
`;
      const out = writeApproval('july-price-review.md', md);
      return { status: 'PASS', summary: `Drafted checklist for ${priced.length} products → ${out}`, outputs: [out] };
    },
  },
  {
    id: 'draft-seo-fixes', title: 'Draft: SEO fix suggestions', description: 'Suggests title/description/canonical/OG fixes for pages flagged by the SEO audit. Edits nothing.',
    riskLevel: 'draft_only', canRead: true, canWrite: 'approvals', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['weekly'],
    async run() {
      runScript('scripts/audit-seo.mjs');
      const seo = readAutomationJson('seo-audit');
      const f = (seo && seo.findings) || {};
      const lines = [];
      (f.missingDescription || []).forEach((p) => lines.push(`- **${p}** — add a unique <meta name="description"> (~150 chars) describing the page's job.`));
      (f.missingCanonical || []).forEach((p) => lines.push(`- **${p}** — add <link rel="canonical" href="https://cutcowithluke.com/${p === 'index' ? '' : p}">.`));
      (f.weakOpenGraph || []).forEach((p) => lines.push(`- **${p}** — add og:title + og:description + og:image.`));
      (f.h1Issues || []).forEach((p) => lines.push(`- **${p}** — ensure exactly one <h1>.`));
      (f.townPagesWithDuplicateDescription || []).forEach((s) => lines.push(`- Town pages share a description: ${s} — make each unique.`));
      const md = `# SEO Fix Suggestions — DRAFT
_Generated: ${stamp()} — suggestions only, no pages edited._

${lines.length ? lines.join('\n') : '- No SEO issues found. ✅'}

To apply: edit the pages by hand (or record safe text swaps in \`ops/approvals/approved-copy-fixes.json\` and run the copy-fix apply flow with --apply).
`;
      const out = writeApproval('seo-fixes.md', md);
      return { status: lines.length ? 'WARN' : 'PASS', summary: `${lines.length} SEO suggestions → ${out}`, outputs: [out] };
    },
  },
  {
    id: 'draft-copy-polish', title: 'Draft: CTA / copy polish', description: 'Suggests stronger CTAs for pages missing a Text-Luke path or a strong closing CTA. Edits nothing.',
    riskLevel: 'draft_only', canRead: true, canWrite: 'approvals', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['weekly'],
    async run() {
      runScript('scripts/sales-opportunity-report.mjs');
      const s = readAutomationJson('sales-opportunities');
      const f = (s && s.findings) || {};
      const lines = [];
      (f.pagesMissingTextLuke || []).forEach((p) => lines.push(`- **${p}** — add a "Text Luke" path: \`<a href="sms:+13126594280?&body=..." data-ev="text_luke_click">Text Luke</a>\`.`));
      (f.pagesMissingFinalCta || []).forEach((p) => lines.push(`- **${p}** — add a strong closing CTA near the bottom (Book a Demo / Start the Finder).`));
      (f.pagesMissingBookCta || []).forEach((p) => lines.push(`- **${p}** — add a Book CTA (\`href="/book"\`).`));
      const md = `# CTA / Copy Polish — DRAFT
_Generated: ${stamp()} — suggestions only, no pages edited. Keep it honest: no fake urgency, no "live" prices._

${lines.length ? lines.join('\n') : '- No obvious CTA gaps found in the static scan. ✅'}
`;
      const out = writeApproval('copy-polish.md', md);
      return { status: lines.length ? 'WARN' : 'PASS', summary: `${lines.length} copy suggestions → ${out}`, outputs: [out] };
    },
  },
  {
    id: 'draft-followup-messages', title: 'Draft: follow-up message templates', description: 'Writes reusable, honest follow-up templates (demo, review ask, referral, price check, owner help). Sends nothing.',
    riskLevel: 'draft_only', canRead: true, canWrite: 'approvals', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: ['weekly'],
    async run() {
      const md = `# Follow-up Message Templates — DRAFT (nothing is sent automatically)
_Generated: ${stamp()}. Copy/paste and personalize. No fake urgency, no pressure._

## After a demo
> Hey [name], really enjoyed showing you the Cutco lineup today! No rush at all — if any
> questions come up, just text me. Whenever you're ready, I've got you.

## Review request
> Hi [name]! If the demo was helpful, a quick honest review would mean a lot:
> cutcowithluke.com/reviews — only if you have a minute, no worries either way.

## Referral ask
> Hey [name] — if you know anyone setting up a kitchen, moving, or hunting for a gift,
> I'd love an intro (with their OK). Zero pressure on them, promise.

## Price check
> Hi [name]! Prices shift, so I always confirm the current number before you decide.
> Want me to pull the latest on the pieces you liked?

## Owner help (existing Cutco)
> Hey [name] — since you already own Cutco, want me to sharpen what you have (free) and
> check for any gaps? No upsell — service first.
`;
      const out = writeApproval('followup-messages.md', md);
      return { status: 'PASS', summary: `Templates drafted → ${out}`, outputs: [out] };
    },
  },

  // ---------------- APPROVAL REQUIRED (dry-run unless --apply + approval file) ----------------
  {
    id: 'apply-approved-price-updates', title: 'Apply approved price updates', description: 'Applies ONLY entries with approved:true from reports/cutco-audit/approved-updates.json. Dry-run by default; --apply to write.',
    riskLevel: 'approval_required', canRead: true, canWrite: 'site (with approval)', canNotify: false, canModifyPublicSite: true, requiresApproval: true, tags: [],
    async run(ctx) {
      const r = runScript('scripts/apply-approved-product-updates.mjs', ctx.apply ? '--apply' : '');
      if (/No approved-updates\.json/.test(r.out)) return { status: 'SKIP', summary: 'No approval file — nothing to apply (safe).', outputs: [] };
      return { status: r.code === 0 ? (ctx.apply ? 'PASS' : 'WARN') : 'FAIL', summary: (ctx.apply ? 'APPLIED approved updates. ' : 'DRY RUN (no --apply). ') + r.lastLine, outputs: [] };
    },
  },
  {
    id: 'apply-approved-copy-fixes', title: 'Apply approved copy fixes', description: 'Applies ONLY approved exact-string swaps from ops/approvals/approved-copy-fixes.json. Dry-run by default; --apply to write.',
    riskLevel: 'approval_required', canRead: true, canWrite: 'site (with approval)', canNotify: false, canModifyPublicSite: true, requiresApproval: true, tags: [],
    async run(ctx) {
      const r = runScript('scripts/apply-approved-copy-fixes.mjs', ctx.apply ? '--apply' : '');
      if (/No approved-copy-fixes\.json/.test(r.out)) return { status: 'SKIP', summary: 'No approval file — nothing to apply (safe).', outputs: [] };
      return { status: r.code === 0 ? (ctx.apply ? 'PASS' : 'WARN') : 'FAIL', summary: (ctx.apply ? 'APPLIED copy fixes. ' : 'DRY RUN (no --apply). ') + r.lastLine, outputs: [] };
    },
  },

  // ---------------- ADMIN ONLY (KV env required; counts only; gitignored) ----------------
  {
    id: 'admin-digest', title: 'Admin digest (counts only)', description: 'Private counts: pending reviews, leads, referrals, top events. Runs only with KV env. No PII committed.',
    riskLevel: 'admin_only', canRead: 'kv', canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: [],
    async run(ctx) { if (!ctx.hasKv) return { status: 'SKIP', summary: 'No KV env — skipped (safe).', outputs: [] }; const r = runScript('scripts/admin-digest.mjs'); return { status: r.code === 0 ? 'PASS' : 'WARN', summary: r.lastLine, outputs: [] }; },
  },
  {
    id: 'review-moderation-helper', title: 'Review moderation helper', description: 'Lists pending review count and flags link-heavy/spammy ones (suggest only — never approves/rejects). KV env required.',
    riskLevel: 'admin_only', canRead: 'kv', canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: [],
    async run(ctx) { if (!ctx.hasKv) return { status: 'SKIP', summary: 'No KV env — skipped (safe).', outputs: [] }; const r = runScript('scripts/ops-review-helper.mjs'); return { status: r.code === 0 ? 'PASS' : 'WARN', summary: r.lastLine, outputs: [] }; },
  },
  {
    id: 'lead-priority-helper', title: 'Lead priority helper', description: 'Ranks leads/referrals by likely value into a PRIVATE gitignored report. Contacts no one. KV env required.',
    riskLevel: 'admin_only', canRead: 'kv', canWrite: 'reports', canNotify: false, canModifyPublicSite: false, requiresApproval: false, tags: [],
    async run(ctx) { if (!ctx.hasKv) return { status: 'SKIP', summary: 'No KV env — skipped (safe).', outputs: [] }; const r = runScript('scripts/ops-lead-helper.mjs'); return { status: r.code === 0 ? 'PASS' : 'WARN', summary: r.lastLine, outputs: [] }; },
  },
];

export const RISK_LEVELS = ['safe_report', 'draft_only', 'approval_required', 'admin_only'];
export function getJob(id) { return JOBS.find((j) => j.id === id); }
export function jobsByRisk(level) { return JOBS.filter((j) => j.riskLevel === level); }
export function jobsByTag(tag) { return JOBS.filter((j) => (j.tags || []).includes(tag)); }
