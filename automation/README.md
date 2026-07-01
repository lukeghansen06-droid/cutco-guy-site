# Automation — safe, report-only site health

These automations make cutcowithluke.com more reliable and sales-useful **without any
risk**. Every one is **read-only**: it inspects the site and writes a report. **None**
of them edit prices, photos, reviews, or content, and **none** push, deploy, or touch
secrets. Anything that could change public content stays **manual, human-approved**.

## Run them locally

```bash
npm run preflight       # master gate: tests + all audits + "safe to push?"
npm run audit:all       # all report-only audits (no tests)

# individual audits
npm run audit:cutco     # products / SKUs / images / prices + stale-price + quiz refs
npm run audit:links     # internal links resolve; no links to _old-singlepage
npm run audit:seo       # title / description / canonical / OG / h1 / sitemap
npm run audit:events    # data-ev coverage on major conversion CTAs
npm run audit:copy      # bad / low-trust wording ("live price", fake urgency, …)
npm run check:cache     # warns if CSS/JS changed but sw.js CACHE wasn't bumped
npm run audit:api       # /api functions parse + degrade gracefully without KV
npm run report:sales    # conversion gaps + recommended next actions
npm run digest:admin    # PRIVATE counts (only if KV env vars are present; gitignored)
```

Reports are written to `reports/automation/*.{md,json}` and `reports/cutco-audit/latest-report.{md,json}`.

## What is safe / report-only

**Everything here is report-only.** Scripts never:
- change a price or a product photo,
- publish or fake a review,
- commit, push, or deploy,
- read or print secrets / KV credentials,
- submit fake leads to production.

## Price safety — how it works

- Prices live in `assets/explorer.js` as a hand-set **"June 2026 snapshot"**. They are
  never called "live" or "guaranteed current."
- `audit:cutco` flags each product as `ok`, **`stale_snapshot`** (snapshot older than the
  current month — re-verify), or **`needs_review`** (no price or no official URL). It
  **never changes a price** — it only tells Luke what to re-check.
- To actually change prices, use the existing human-in-the-loop flow:
  1. Re-verify the price on cutco.com yourself.
  2. Add an entry to `reports/cutco-audit/approved-updates.json` (see the example file).
  3. Run `npm run apply:approved` (dry-run by default; `--apply` to write, after backup).

## What never auto-updates

Prices, product photos, reviews, and any public copy. Full stop. The audits surface
issues; a human approves and applies every real change.

## Reports ignored by git

`reports/automation/*.{json,md}` and `reports/cutco-audit/latest-report.*` are
**gitignored** — they're regenerated on demand and can contain aggregated data. The
`digest:admin` report is counts-only but is also ignored (never commit it). READMEs and
`*.example.json` files are **not** ignored and are safe to commit.

## GitHub Actions

`.github/workflows/site-health-audit.yml` runs daily (and on demand) with
`permissions: contents: read` — so it **cannot** push or commit. It runs the tests and
every audit, then uploads the reports as downloadable artifacts. No secrets are used.
(`.github/workflows/cutco-product-audit.yml` additionally does an online URL-reachability
pass, also report-only.)

## Not added on purpose

- **Vercel Cron** (`api/cron/*`): skipped. It would need an auth-protected endpoint and
  config that isn't present; the report-only GitHub Action is safer and needs no secrets.
- **Public /automation dashboard**: skipped. A public ops page would risk exposing data;
  run the local reports (or `digest:admin` with KV env) instead. Revisit only behind the
  existing `lib/admin.js` auth.

## Interpreting warnings

- **FAIL** — a real problem to fix before pushing (broken link, missing title, bad copy,
  test failure, forbidden staged file).
- **WARN** — advisory (e.g. stale snapshot to re-verify, a page missing a Text-Luke link,
  a CTA without `data-ev`). Not a blocker; worth a look.
- `preflight` prints **SAFE TO PUSH? YES/NO**. Even on YES, nothing is pushed — Luke
  still decides and says "push."
