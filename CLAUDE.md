# CLAUDE.md — working guidelines for cutcowithluke.com

Behavioral guidelines for any AI coding agent on this repo. Read this before editing.

Part 1 adapts the **Karpathy-inspired guidelines** (MIT, by forrestchang — github.com/multica-ai/andrej-karpathy-skills, from Andrej Karpathy's notes on LLM coding pitfalls). Part 2 is this project's hard rules. When they conflict, Part 2 wins.

---

## Part 1 — How to work (general)

**Tradeoff:** these bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think before coding
- State assumptions explicitly; if uncertain, ask instead of guessing.
- If there are multiple interpretations, surface them — don't silently pick one.
- If a simpler approach exists, say so. Push back when warranted.
- If something's unclear, stop, name what's confusing, and ask.

### 2. Simplicity first
- Minimum code that solves the problem. Nothing speculative.
- No features, abstractions, "configurability," or error handling that wasn't asked for.
- If 200 lines could be 50, rewrite it. Ask: "would a senior engineer call this overcomplicated?"

### 3. Surgical changes
- Touch only what the task requires. Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken. Match the existing style.
- Only remove code YOUR change orphaned. Flag unrelated dead code — don't delete it.
- Every changed line should trace directly to the request.

### 4. Goal-driven execution
- Turn tasks into verifiable goals ("fix the bug" → "write a test that reproduces it, then make it pass").
- For multi-step work, state a short plan with a `verify:` check per step, then loop until verified.

---

## Part 2 — Project rules (cutcowithluke.com)

**Stack:** static multi-page HTML/CSS/vanilla-JS (ES modules) + Vercel serverless functions in `/api` (ESM) + Vercel KV. No framework. `vercel.json` `cleanUrls` (so `/find` = `find.html`). Deploys on push to `main`. Fonts: Fraunces (display) / Inter (body) / Sora (UI). Tests: `bun test` (in `/tests`). Full reference: `CLAUDE_CAPABILITY_PROFILE.md`; latest state: `CURRENT_CUTCO_HANDOFF.md`.

### Never do
- **Never push or deploy** unless Luke explicitly says "push" / "deploy" in that message.
- **Never `git add -A`.** Stage only the specific files for the current task.
- **Never touch** `.env`, `.vercel/`, KV credentials, admin/stats keys, or any secret. Never print them.
- **Never invent, guess, or auto-scrape prices.** Use the real values already in `assets/explorer.js` ("as of June 2026") and always keep the "confirm on cutco.com" note. Confirm any price change against the official cutco.com page.
- **Never fabricate reviews, testimonials, names, or stats.** The reviews wall shows only real, KV-approved submissions.
- **Don't stage** `CLAUDE.md`, `CLAUDE_CAPABILITY_PROFILE.md`, `CURRENT_CUTCO_HANDOFF.md`, screenshots, or docs into feature commits unless asked.

### Always do
- **Keep the catalog consistent:** the product explorer is 89 pieces — keep **89 products ↔ 89 SKU mappings ↔ 89 files in `assets/products/<SKU>.jpg`** in sync (0 missing, 0 orphans). If you change the catalog, re-check this and update the count labels in `find.html` + `explorer.js`.
- **Product images are self-hosted** at `/assets/products/<SKU>.jpg` (Cutco's CDN is referer-blocked). Every card must show a real photo; the SVG icon is a last-resort fallback only.
- **Bump `sw.js` `CACHE`** (e.g. `cutco-v5` → `v6`) whenever you change CSS or JS, or returning visitors get stale assets.
- **`.reveal` starts hidden** and is shown by `assets/app.js`'s IntersectionObserver — any page using `.reveal` must load `app.js`; keep the no-JS fallback and safety timeout.
- Shared header/footer are **pasted into every page** (no server include) — change `components/` **and** each page together (e.g. the footer email `Lukehansen01@gmail.com` must match everywhere).

### Before committing
Run `bun test` (all green), confirm `git status` shows only the intended files, then show Luke: the changed files, the test result, and a one-line summary. **Wait for explicit approval before pushing or deploying.** Prefer a clean `git commit` + push over any CLI/`.bat` deploy.
