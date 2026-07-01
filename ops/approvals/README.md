# Approval queue

Nothing public-facing changes without an **explicit, approved** entry here **and** an
explicit `--apply`. No approval file = no mutation. Ever.

## Two approval files

### 1. Price updates
- **Real file the applier reads:** `reports/cutco-audit/approved-updates.json`
- **Template:** `reports/cutco-audit/approved-updates.example.json` (also mirrored here as
  `approved-updates.example.json` for reference)
- **Rules:** each entry needs `approved: true`, a `sku` that matches `assets/explorer.js`,
  an integer `newPriceCents`, an `officialUrl`, and a `priceVerifiedLabel`
  (e.g. `"July 2026 manual verification"`). Only add prices **you personally verified on
  cutco.com**. The tool never fetches or guesses.
- **Apply:** `node scripts/run-job.mjs apply-approved-price-updates` (dry-run) →
  add `--apply` to write (backs up `explorer.js` first).

### 2. Copy fixes
- **Real file the applier reads:** `ops/approvals/approved-copy-fixes.json`
- **Template:** `approved-copy-fixes.example.json`
- **Rules:** each entry needs `approved: true`, a target `file` (`*.html`, `assets/*.css`,
  `assets/*.js` only), a **unique** `find` string, and a `replace`. Ambiguous matches are
  refused. Disallowed wording (e.g. "live price") is refused.
- **Apply:** `node scripts/run-job.mjs apply-approved-copy-fixes` (dry-run) →
  add `--apply` to write (backs up the file first). Then bump `sw.js` CACHE + run preflight.

## What's committable vs ignored
- **Committable:** this README and the `*.example.json` templates.
- **Gitignored:** the real working files (`approved-updates.json`, `approved-copy-fixes.json`)
  and generated drafts (`july-price-review.md`, `seo-fixes.md`, `copy-polish.md`,
  `followup-messages.md`). They regenerate on demand.

## The golden rule
Draft jobs and audits only **suggest**. A human reads the suggestion, approves the exact
change here, and runs the apply job with `--apply`. Automation never decides to change the
public site, prices, photos, or reviews on its own.
