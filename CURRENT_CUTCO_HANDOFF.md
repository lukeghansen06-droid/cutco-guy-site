# CURRENT_CUTCO_HANDOFF.md

> Point-in-time state of **cutcowithluke.com** for another AI (e.g. ChatGPT) to pick up.
> Baseline: `CLAUDE_CAPABILITY_PROFILE.md`. This file reports **what is true right now**.
> Generated: 2026-06-30. **No push, no deploy, no secrets touched** to create this.
>
> ⚠️ **Verification caveat — read first.** This snapshot was produced from the Cowork
> assistant's environment, which has two limits right now:
> 1. **`bun` is not installed here**, so the test suite could **not** be run — statuses that
>    depend on tests are marked **NOT RUN (run `bun test` in VS Code)**.
> 2. The repo mount returned **corrupted bytes for `meet.html` and the git index**, so
>    `git status` / `git diff` could **not** be read reliably. Git facts below come from
>    `git log` + ahead/behind counts; **confirm working-tree state with `git status` in VS Code.**
> Where possible, "current" state was verified against the **live production site**
> (local `main` is level with origin, so live == the latest commit).

---

## 1. Git state
- **Branch:** `main`
- **Ahead / behind origin/main:** `0 ahead / 0 behind` (local commits match origin). Clone is **shallow**, so treat as approximate.
- **Latest commits (most recent first):**
  - `feat: homepage funnel copy + local SEO pages + schema`
  - `fix: stale service-worker cache bust + cleaner motion + book polish`
  - `style: premium visual pass — Fraunces+Inter type, champagne-gold accent, animated hero, bigger banner`
- **Staged?** UNVERIFIED here (git index unreadable via mount) → **run `git status` in VS Code.**
- **Uncommitted?** UNVERIFIED here → **run `git status`.** Given `0 ahead/0 behind` and the coding agent's normal commit+push flow, the tree is *likely* clean, but confirm before new work.
- **Pushed/deployed without approval?** The Cowork assistant did **not** push or deploy anything to produce this handoff. The recent redesign commits above were made by the **coding agent (VS Code Claude)** and are already on `origin`/live; they predate this task. If those weren't explicitly approved, flag with Luke.

## 2. Recently changed files (from commit messages + live-verified differences; precise `git diff` unavailable here)
- **`assets/styles.css`** — *what:* full "premium visual pass" — Fraunces (display) + Inter (body) + Sora (UI) via `--font-display`/`--font-body`/`--font-ui`, champagne-gold accent, animated hero, radial background, plus explorer/wishlist styles. *Why:* visual upgrade. *Affects:* **UI** (site-wide).
- **`assets/explorer.js`** — *what:* product explorer + wishlist; images now local `/assets/products/<SKU>.jpg`; real June-2026 prices; cutco.com "View ↗" links. *Why:* build the catalog + fix referer-blocked CDN images. *Affects:* **UI + data** (`/find`).
- **Local-SEO pages** (`winnetka-`, `glencoe-`, `northbrook-`, `evanston-`, `north-shore-`, `depauw-cutco.html`) — *what:* new town/campus landing pages. *Why:* local SEO. *Affects:* **UI + SEO**.
- **`sw.js`** — *what:* `CACHE` bumped to `cutco-v4`. *Why:* bust stale caches after CSS/JS changes. *Affects:* **deploy/caching behavior**.
- **`meet.html`** — *what:* Spain section, `📷`→`🌅` + reworded photo alt (safari removed). *Why:* content accuracy + timeliness. *Affects:* **UI/content**. (Live-verified present.)
- **All page footers / `components/footer.html` / `assets/assistant.js` / `api/lead.js`** — *what:* contact email is now **`Lukehansen01@gmail.com`** everywhere (no `lukeghansen06` remains). *Affects:* **UI + API** (lead notifications).
- **`find.html`** — *what:* H1 "Let's find your perfect Cutco."; explorer section active. *Affects:* **UI/SEO**.
- **`index.html`** — *what:* marquee "15-day money-back **guarantee**". *Affects:* **UI/copy**.
- **`reviews.html`** — *what:* referral emoji 🔫→🔪. *Affects:* **UI**.
- **`assets/app.js`** — *what:* scroll-reveal, cursor spotlight, mobile sticky "Book + Text Luke" bar, `[data-ev]`→`/api/track`, service-worker registration. *Affects:* **UI + analytics**.
- **New files present:** `gift.html`, `owners.html`, `referred.html`, `thanks.html`, `card.html`, `assets/recommender.js` + `recommender-ui.js`, `optimize/` toolkit, `tests/`. (See §3.)
- **Doc files (this session):** `CLAUDE_CAPABILITY_PROFILE.md`, `CURRENT_CUTCO_HANDOFF.md` — untracked docs; do **not** affect the site.

## 3. Current website feature status (✅ live-verified · ⚠️ verify)
- **Home (`/`)** — ✅ live (redesigned, Fraunces/Inter, hero banner).
- **Book (`/book`)** — ✅ live (Calendly demo; reminders set on Calendly side).
- **Find quiz (`/find` recommender)** — ✅ present (intent chips + quiz). ⚠️ Verify each quiz path's recommendation locally.
- **Product explorer (`/find`)** — ✅ **works**: renders **empty on initial load** (must pick a category or search), then **12 cards per page + "load more"**; category dropdown = 9 options; **images load** (12/12 on first "all" page), **prices show**, add-to-list works.
- **My List / wishlist** — ✅ present ("♡ My list 0" + "My Cutco list" drawer; localStorage; "text to Luke"). ⚠️ Verify the running **total** math + SMS body locally.
- **Knife Drawer Audit** — ❓ **NOT FOUND as a page** in the repo. Confirm whether it exists (a section?) or is still planned before referencing it.
- **Gift (`/gift`)** — ✅ file present. ⚠️ Verify contents.
- **Owners (`/owners`)** — ✅ file present. ⚠️ Verify contents.
- **Referred (`/referred`)** — ✅ file present. ⚠️ Verify contents.
- **Reviews / referrals (`/reviews`)** — ✅ live: KV-backed reviews wall + form (moderated at `/moderate`) + multi-person referral → `/api/lead`, private `/leads`.
- **FAQ (`/faq`)** — ✅ live.
- **Thanks (`/thanks`)** — ✅ file present. ⚠️ Verify.
- **Digital card (`/card`)** — ✅ file present. ⚠️ Verify.
- **Local SEO pages** — ✅ 6 present (winnetka/glencoe/northbrook/evanston/north-shore/depauw).
- **Analytics / events** — ✅ Vercel Web Analytics + custom `[data-ev]`→`/api/track` (Vercel KV); dashboard `/stats.html?key=…`.
- **Service worker cache version** — ✅ **`cutco-v4`** (in `sw.js`).

## 4. Pricing system status
- **Product data location:** hardcoded in **`assets/explorer.js`** (array `P` = products with name/category/icon/desc/keywords/cutco.com link). No separate JSON.
- **Prices location:** hardcoded in **`assets/explorer.js`** (`PRICES` map, plus `VALUES` for "bought-separately" set values).
- **Hardcoded?** **Yes.**
- **Any prices changed?** Not by this handoff. They are the coding agent's "as of June 2026" set.
- **Verified/current?** Labeled **"as of June 2026."** Not independently re-verified against cutco.com in this pass. Treat as a manual snapshot.
- **Stale/missing handling:** Products without a price simply omit the price line; every card carries a cutco.com **"View ↗"** link. Price note (verified live): *"Prices shown are as of June 2026 and are set by Cutco — always confirm the current price on cutco.com via 'View ↗'… EasyPay…"*
- **Official Cutco link per product?** **Yes** — each card links to a cutco.com category/product page.
- **My List total:** ⚠️ drawer present; **verify the total computes correctly** (old build summed prices + showed EasyPay/savings).
- **Price confidence/freshness system:** only the static "as of June 2026" label — **no automated freshness/verification**.
- **Auto-scraping:** **None.** Prices are static; nothing scrapes live prices.
- **Known price risks:** prices **drift** and must be re-checked manually; publicly posting prices may warrant a Vector Marketing policy check; keep the "confirm on cutco.com" caveat.

## 5. Product / image status
- **Products in catalog:** live UI says **"79 pieces."** Local (unreliable) reads suggested **~89** entries. ⚠️ **Discrepancy — confirm the true count locally** (`P.length` in `explorer.js`; may be a stale "79" label or extra/duplicate entries).
- **Local product images:** **89** files in `assets/products/*.jpg` (count via sandbox; treat as approximate).
- **Missing SKU images:** could **not** be reliably cross-checked here (mount limitation). In-browser, the first "all" page showed **12/12 images loaded, 0 broken** — a good sign, but not a full-catalog check. ⚠️ Run a full SKU↔file check locally.
- **Cards falling back to icons:** none observed on the first page (all photos loaded). ⚠️ Confirm across all categories.
- **Mismatched names/SKUs/images:** not detected in the sample; ⚠️ verify the 79-vs-89 discrepancy isn't caused by mismatches.

## 6. Tests / checks run
- **`bun test` (all):** ⛔ **NOT RUN** — `bun` is not installed in this environment. Tests exist in `/tests` (`app`, `links`, `smoke`, `validate`, `recommender`, `lead-api`, `reviews-api`). **Run `bun test` in VS Code.**
- **Link integrity (`tests/links.test.js`):** ⛔ NOT RUN (same reason).
- **Recommender (`tests/recommender.test.js`):** ⛔ NOT RUN.
- **Validation (`tests/validate.test.js`):** ⛔ NOT RUN.
- **Integrity checks:** ⛔ NOT RUN.
- **Local preview:** ✅ (indirect) — production pages fetch and render correctly; explorer verified working in a live browser.
- **Console errors:** not formally captured; **no errors surfaced** during in-browser JS inspection of `/find`. ⚠️ Do a quick DevTools console pass locally.
- **Mobile preview:** ⚠️ **not checked** in this pass — verify the redesigned layout + sticky "Book/Text Luke" bar at mobile widths.

## 7. What Luke should review before push/deploy
- **Run `git status`** in VS Code to confirm nothing is uncommitted before any push.
- **Product count 79 vs 89** — reconcile the label/array/images.
- **Explorer UX** — it's **empty until a category/search is chosen**; decide if it should default to "all" (show products immediately).
- **Quiz paths** — click each recommender answer and sanity-check the recommended pieces.
- **Price display** — spot-check a few prices against cutco.com; confirm My List total + EasyPay math.
- **Mobile layout** — homepage hero, `/find` explorer grid, sticky bottom bar.
- **Forms** — submit a test review (should land pending in `/moderate`) and a test referral/lead (should land in `/leads`).
- **Knife Drawer Audit** — confirm whether this feature exists or is still to build.

## 8. Known risks / fragile areas
- **Explorer empty on load** — renders only after category/search; may look "broken/empty" to first-time visitors.
- **79 vs 89 product-count mismatch** — label/array/image set may be out of sync.
- **Prices go stale** — hardcoded, "as of June 2026," no auto-refresh; keep cutco.com caveat.
- **Missing SKU → icon fallback** — any product whose `/assets/products/<SKU>.jpg` is absent silently shows an icon; keep images in sync with the catalog.
- **Service-worker caching** — after any CSS/JS change, **bump `sw.js` `CACHE`** (currently `cutco-v4`) or returning visitors get stale assets.
- **Reveal animations** — `.reveal` starts hidden and needs `app.js`'s IntersectionObserver; a page missing `app.js` can show invisible content (keep the no-JS fallback + safety timeout).
- **Header/footer duplication** — shared markup is pasted per page; change `components/` **and** every page together.
- **Two update paths** — GitHub push (auto-deploy) vs Vercel CLI deploy can overwrite each other; prefer git push and reconcile first.
- **KV-backed APIs** need env vars set on the Vercel project (`/api/reviews`, `/api/lead`, `/api/track`).
- **This environment's limits** — sandbox can't run `bun` and can return stale/corrupted file bytes; always re-verify locally.

## 9. Recommended next prompt (give this to your Claude coding agent)
> In `C:\Users\Luke\luke-maxxing-os\cutco-guy-site`, first run `git status` and tell me exactly what's staged/uncommitted — do **not** push or deploy. Then run `bun test` and report PASS/FAIL for every test file (paste any failing output).
>
> Next, reconcile the product catalog: in `assets/explorer.js` print `P.length` and compare it to the number of files in `assets/products/`. If they differ (the site copy says "79 pieces" but the array/images may be ~89), fix the mismatch: correct the "79 pieces" label to the real count, remove any duplicate/placeholder products, and make sure **every** product has a matching `/assets/products/<SKU>.jpg` (list any SKUs with no image file). Report the final count.
>
> Then improve the explorer's first impression: on `/find`, have `#expGrid` show the full catalog (category = "all") on initial load instead of an empty grid, keeping the 12-per-page "load more," search, and category filter working. Verify every product photo loads (no icon fallbacks) and prices render.
>
> Keep it **local only**: run `bun test`, load `/find` and confirm the grid, images, prices, and "My List" total all work, show me a diff/summary, and **wait for my explicit "push"/"deploy" before doing either.** Don't invent prices or reviews; keep the "confirm on cutco.com" note; if you change any CSS/JS, bump `sw.js` `CACHE` to `cutco-v5`.
