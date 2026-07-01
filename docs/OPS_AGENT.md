# Ops Agent — guide

The Ops Agent is a set of small background jobs that keep cutcowithluke.com healthy and
sales-useful. It can read the site, generate reports, and draft suggestions. It can also
apply changes — but **only** from an approval file you filled in, and only when you pass
`--apply`. It never pushes, deploys, touches secrets, or invents prices/reviews.

## The four risk levels

- 🟢 **safe_report** — reads public files, writes reports. Changes no site file.
- 🟡 **draft_only** — writes suggestions/drafts into `ops/approvals/`. Applies nothing.
- 🟠 **approval_required** — applies exact changes **from an approval file**. Dry-run
  unless you add `--apply`.
- 🔴 **admin_only** — reads Vercel KV **only if the KV env vars are present**; reports are
  counts-only and gitignored. Never commits private data.

## Jobs

**Safe reports:** `product-health`, `price-staleness`, `link-health`, `seo-health`,
`event-coverage`, `copy-trust-guard`, `api-health`, `cache-bump-check`,
`sales-opportunities`, `full-preflight`.

**Drafts:** `draft-july-price-review`, `draft-seo-fixes`, `draft-copy-polish`,
`draft-followup-messages`.

**Approval-required:** `apply-approved-price-updates`, `apply-approved-copy-fixes`.

**Admin-only:** `admin-digest`, `review-moderation-helper`, `lead-priority-helper`.

Run `npm run ops:list` to see them all with risk icons.

## Running safe jobs

```bash
npm run ops:safe      # every non-mutating job (safe_report + draft_only)
npm run ops:daily     # daily set
npm run ops:weekly    # weekly set
npm run ops:preflight # bun test + full preflight (safe-to-push check)
```
Reports land in `ops/reports/` (run log) and `reports/automation/` (individual audits).

## Approval-required jobs (how a real change happens)

Automation only ever **suggests**. To actually change the site:

**Prices**
1. `npm run ops:price-review` → drafts `ops/approvals/july-price-review.md` (a checklist
   with official URLs). Nothing changed.
2. Verify each price yourself on cutco.com.
3. Fill in `reports/cutco-audit/approved-updates.json` (from the example), `approved: true`.
4. Dry-run: `node scripts/run-job.mjs apply-approved-price-updates`
5. Apply: `node scripts/run-job.mjs apply-approved-price-updates --apply` (backs up
   `explorer.js` first), then bump `sw.js` CACHE and run `npm run ops:preflight`.

**Copy**
1. Fill in `ops/approvals/approved-copy-fixes.json` (from the example) with exact,
   unique `find`/`replace` pairs, `approved: true`.
2. Dry-run: `node scripts/run-job.mjs apply-approved-copy-fixes`
3. Apply: add `--apply` (backs up each file), then bump cache + preflight.

## What never happens automatically

Prices, product photos, and reviews are **never** changed by automation. No message,
email, or text is ever sent. No push, no deploy. Admin/private data is never committed.

## Reports gitignored

`ops/reports/*`, generated drafts in `ops/approvals/` (`july-price-review.md`,
`seo-fixes.md`, `copy-polish.md`, `followup-messages.md`), the working
`approved-*.json` files, and `reports/automation/*` are all gitignored. The READMEs and
`*.example.json` templates are committable.

## GitHub Actions

`.github/workflows/ops-agent-report.yml` runs daily (and on demand) with
`permissions: contents: read` — it **cannot** commit or push. It runs only safe + draft
jobs (`--all-safe`), never admin jobs, and uploads the reports as artifacts. No secrets.

## Private admin endpoint

`api/admin-ops.js` returns an ops health summary (counts + top event labels only) and is
**auth-gated** by `REVIEW_ADMIN_KEY` (`?key=…`, via `lib/admin.js`). It exposes no
names/emails/phones, runs no mutations, and returns 401 without the key.

## Before any push

```bash
npm run ops:preflight     # tests + all audits + "safe to push?"
```
Even when it says **YES**, nothing is pushed — you decide and say "push."
