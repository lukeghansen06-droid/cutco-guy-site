# Cutco Product Audit — report-only, human-in-the-loop

A **safe** way to keep prices/photos honest without ever auto-publishing a wrong number.

## What this is
- `scripts/audit-cutco-products.mjs` — reads the local catalog (`assets/explorer.js`),
  runs integrity checks, optionally checks official Cutco URLs, and writes a
  **report only**. It never edits prices, never overwrites images, never commits,
  never pushes, never deploys.
- `latest-report.md` / `latest-report.json` — the newest audit.
- `approved-updates.example.json` — the format Luke fills in to *manually* approve
  a price change he has personally verified on cutco.com.
- `scripts/apply-approved-product-updates.mjs` — applies **only** manually-approved
  updates. **Dry-run by default**; needs `--apply` to write; backs up first.

## Run the audit
```
npm run audit:cutco                 # local integrity only (fast)
node scripts/audit-cutco-products.mjs --online      # + check every official URL
node scripts/audit-cutco-products.mjs --online=8    # + check first 8 URLs
```

## Why prices are never scraped automatically
Cutco product pages are **JS-rendered** and show **multiple money values** (e.g.
EasyPay monthly amounts like $11 / $14 / $17). There is no single static price to
read reliably, so the audit marks every online price **`manual_review_required`**.
Publishing a scraped value would risk showing a **wrong price** — which we never do.

## Safe update flow (the only way prices change)
1. Run the audit → read `latest-report.md`.
2. Luke opens cutco.com and **manually confirms** the real current price.
3. Copy `approved-updates.example.json` → `approved-updates.json` and fill it in
   with `approved: true` for each verified item.
4. Dry-run: `node scripts/apply-approved-product-updates.mjs`
   (shows the exact old → new diff, writes nothing).
5. Apply: `node scripts/apply-approved-product-updates.mjs --apply`
   (backs up `assets/explorer.js`, then updates only approved items).
6. Review the diff, bump `sw.js` CACHE, then commit/push **with Luke's approval**.

## Hard rules
- No auto price changes. No auto image overwrite. No auto commit/push/deploy.
- Candidate images (if ever downloaded) go to `image-candidates/<SKU>/`, **never**
  into `assets/products/` until Luke verifies the SKU/product match.
- Never fabricate prices or reviews.
