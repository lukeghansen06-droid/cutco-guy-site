# Cutco Site Upgrade — Design Spec (v2: Guided Conversion System)

**Date:** 2026-06-29
**Project:** cutco-guy-site (cutcowithluke.com)
**Owner:** Luke Hansen
**Approach:** Surgical content reuse + multi-page restructure (NO framework rebuild)
**Status:** Awaiting Luke's review before any live-site changes

> **v2 note:** v1 was a single-page polish. Luke redirected to a multi-page **guided conversion system**: keep the content and dark premium style, but route visitors by intent across focused pages instead of one massive scroll. This spec supersedes v1.

---

## 1. Vision & Scope

Turn the site from one long scrapbook-style page into a clean, **app-style guided conversion system**. The homepage becomes a short, premium **hub**; the rest of the content lives in focused pages, each with **one obvious next action**. Every page answers three questions: *Why trust Luke? Why is this worth my time? What do I click next?*

### In scope
- Restructure the existing single page into **6 primary pages + 1 low-priority page**, sharing one design system.
- Keep the **dark premium aesthetic**, brand voice, and (almost) all content — reorganized, merged, and de-cluttered.
- Premium polish: typography, spacing, motion, mobile, speed (carried from v1).
- Conversion system: sticky mobile Book bar, trust signals at decision points, clean Full/Quick demo, intent-based routing.
- New/upgraded features: **knife/set recommender**, **testimonial capture + auto-display**, **AI assistant polish**, **lead/reminder capture**.
- Ship it: after Luke approves the local preview, deploy to production.

### Out of scope (YAGNI)
- No React/Vue/Svelte, no bundler, no build step. Plain static HTML/CSS/JS.
- No splitting into 10+ nav links. Top nav stays 6 items; everything else nests inside pages or the footer.
- No deleting content wholesale — content is **relocated**, not destroyed.
- No feature that doesn't serve trust, speed, booking, referrals, reviews, or product clarity.
- No fake anything: placeholder reviews are removed; no "we texted you" unless a real text sends.

---

## 2. Sitemap

```
/                      Home — the hub (short, premium, conversion-focused)
/book                  Book a Demo — the money page
/find                  Find Your Cutco — recommender + assistant + explorer + browse
/meet                  Meet Luke — personal brand / trust
/reviews               Reviews + Referrals — social proof + refer-a-friend
/faq                   FAQ + Guarantee — kill objections, build safety
/work                  Work With Me — recruiting (low priority; linked from footer)
/stats   (private)     Existing analytics dashboard — UNCHANGED
/leads   (private)     New: key-gated list of captured leads
```

**Top nav (all pages):** Home · Book · Find Your Cutco · Meet Luke · Reviews · FAQ
**Footer (all pages):** contact info, Work With Me, social, copyright, privacy note.
**Global:** sticky "Book a Demo" bar on mobile; hamburger menu on mobile.

Clean URLs (`/book` not `/book.html`) via `vercel.json` `cleanUrls: true`.

---

## 3. Page-by-Page Section Plan

### `/` Home (hub)
Short and premium. Sections, in order:
1. **Hero** — who Luke is + one-line promise + primary CTA (Book) + secondary (Find Your Cutco).
2. **Quick trust bar** — guarantee badge, star-rating summary, "North Shore / DePauw," (real) impact stat. Compact strip.
3. **"What are you here for?" path selector** — the routing core. Cards: *Book a demo* → /book · *Find the right Cutco* → /find · *Get to know Luke* → /meet · *See reviews* → /reviews · *Questions?* → /faq.
4. **Book preview** — short pitch + button to /book.
5. **Product starting-point preview** — teaser of the recommender → /find.
6. **Reviews/trust preview** — 1–2 real testimonials → /reviews (hidden until real reviews exist).
7. **Final CTA** — single clear "Book a demo" with no-pressure microcopy.

Home does NOT contain the full catalog, full FAQ, recruiting, or scrapbook.

### `/book` Book a Demo (money page)
- Intro: two clear options — **Full Hour** vs **Quick 20** (one primary, one secondary).
- **What happens in the demo** (from `howitworks`).
- **No-pressure explanation** (from `promise`).
- In-person OR Google Meet/Zoom note.
- **Objection answers** right next to the booking buttons (from `why` — "why meet me vs. buying cold").
- **Calendly embedded** cleanly (not just a link).
- How to prepare (from `prep`).
- Sticky mobile Book bar present.

### `/find` Find Your Cutco (guided product flow)
Combine today's scattered tools into one "tell me what you need, I'll guide you" flow:
- **Recommender quiz** (upgraded `quiz`): 3–5 friendly questions → a sensible starting point (piece or set) + one-line why + Book/Browse CTA.
- **Intent paths:** My kitchen · Gift · New home/apartment · I cook a lot · I barely cook · I already own Cutco · Best 1–3 pieces · Full setup.
- **AI assistant** (polished `assistant`) — ask anything, suggested questions.
- **Product explorer / browse + prices** (`explore` + `browse`).
- **Specials** (`specials`) — shown only when a real special is active, else hidden.
Goal: visitor feels smarter and booking feels like the natural next step.

### `/meet` Meet Luke (trust, not oversharing)
Warmer, cleaner versions of: Chicago / North Shore / DePauw, soccer, family, pets (`crew`), off-the-clock (`life`, `gallery`), values/why-I-do-Cutco (`philosophy`, `spain`). Trimmed for trust, not a scrapbook. Ends with a Book CTA.

### `/reviews` Reviews + Referrals
- **Real testimonials only.** All placeholder/sample reviews removed immediately.
- **Review form** → auto-displays new (real) reviews with anti-spam safeguards.
- **Referral form** + examples of good people to refer + a respectful "referrals are appreciated and always handled respectfully" note.
- Empty-state until real reviews exist (no fake filler).

### `/faq` FAQ + Guarantee
Directly handle skepticism: Is this pushy? · Do I have to buy? · How much? · What is Cutco? · What is Vector? · Is this legit? · Forever Guarantee (how it works) · Sharpening · I already own Cutco · I don't cook much. Plus the full **guarantee** explainer. Ends with a reassured Book CTA.

### `/work` Work With Me (low priority)
Recruiting/opportunity (`work`), kept separate so it never competes with the customer flow. Linked from the footer + a small standalone page.

### Footer (global) & Contact
`contact` content → footer (email, area served, social) on every page, plus a contact block on `/book`.

---

## 4. Content Mapping (what moves / merges / stays / hides)

| Existing section | Destination | Action |
|---|---|---|
| `brand` | Home hero + global header | Reuse, tighten |
| `stats` | Home quick trust bar | Reuse **only if a real stat**; else drop |
| `kitchen` | Find (intro) + Home preview | Merge |
| `help` ("what I help with") | Find | Move |
| `quiz` | Find — **recommender** | Upgrade |
| `assistant` | Find | Move + polish |
| `explore` | Find | Move |
| `browse` | Find | Move |
| `specials` | Find | Move; **hide until a real special** |
| `book` | Book (Full Hour) | Move, redesign options |
| `quickq` ("quick question") | Book (secondary) + links to assistant | Merge |
| `howitworks` | Book | Move |
| `prep` | Book | Move |
| `promise` | Book | Move |
| `why` | Book (objection block) + Home trust | Split/reuse |
| `meet` | Meet | Move |
| `gallery` | Meet | Move, trim |
| `spain` | Meet | Move |
| `family` | Meet | Move |
| `crew` (pets) | Meet | Move |
| `life` | Meet | Move, trim |
| `philosophy` | Meet (+ small Home line) | Move |
| `reviews` | Reviews | Move; **remove placeholders** |
| `refer` | Reviews | Move |
| `guarantee` | FAQ | Move |
| `faq` | FAQ | Move |
| `work` | Work With Me | Move, de-prioritize |
| `contact` | Global footer + Book | Move |

**Hidden until ready:** placeholder reviews (until real ones), specials (until a real special), any feature that can't be made reliable (flagged before launch).

---

## 5. Conversion Goals

Priority of desired actions: **1) Book a demo → 2) Leave a review → 3) Refer someone → 4) Understand the product.**

- Every page has exactly **one obvious primary next action.**
- `/book` is the money page; all roads lead there.
- A booking CTA is reachable in **one tap** on mobile (sticky bar) from every page.
- Each main booking button is flanked by a **trust signal** (guarantee badge, rating, or real review) and **no-pressure microcopy**.
- The path selector on Home routes intent fast so nobody is forced through irrelevant content.
- Target experience: a first-time mobile visitor trusts Luke and can book in ~20 seconds.

---

## 6. Mobile Requirements (primary audience)

- [ ] **Sticky "Book a Demo" bar** on phones — thumb-reachable, never covers key content.
- [ ] **Hamburger menu** — simple, fast, closes on selection; nav also degrades gracefully.
- [ ] No horizontal scroll at any width ≥ 320px.
- [ ] Tap targets ≥ 44×44px with spacing.
- [ ] Body text ≥ 16px; headings via `clamp()`.
- [ ] Each page = one obvious next action above the fold or via sticky bar.
- [ ] Responsive images with explicit dimensions (no layout shift); lazy-load below the fold.
- [ ] Fast first paint on a mid-tier phone; no render-blocking scripts.
- [ ] Subtle motion; disabled under `prefers-reduced-motion`.
- [ ] Correct input types (`tel`, `email`) and autocomplete on all forms.

---

## 7. Technical Implementation Plan

### Architecture
- **Static multi-page site.** One HTML file per page (`index.html`, `book.html`, `find.html`, `meet.html`, `reviews.html`, `faq.html`, `work.html`), plus private `stats.html` (unchanged) and `leads.html` (new, key-gated).
- **Shared design system:** extract the inline styles into `assets/styles.css` (standardized tokens building on existing `--bg --panel --line --ink --mut --cyan --blue --teal --gold --ang`, plus new type-scale and spacing tokens). All pages link it.
- **Shared behavior:** `assets/app.js` for nav/hamburger, sticky Book bar, and shared components.
- **Shared chrome (header/nav/footer):** authored once and duplicated into each page's HTML for robustness (renders without JS); the hamburger/sticky behaviors are progressive enhancement via `app.js`. (No build step, so duplication is the reliable choice; a single source comment marks the canonical block to keep them in sync.)
- **Routing:** `vercel.json` with `cleanUrls: true` (and sensible `trailingSlash`) so links are `/book`, `/find`, etc.

### Features
- **Recommender** (`/find`): vanilla-JS quiz; deterministic mapping of answers → recommended starting point; no backend.
- **Reviews** (`/reviews`): submit → `api/reviews.js` (Vercel KV, mirroring `api/track.js`) → page fetches + renders. **Auto-display** with safeguards: honeypot field, min/max length, basic profanity/link filter, rate-limit per IP-hash, and a private kill-switch flag to hide a bad entry if ever needed. No fake/sample reviews shipped.
- **Lead/reminder capture:** form (name + phone/email + preferred reminder time + note) → `api/lead.js` → (a) email the lead to Luke and (b) store in KV for the `/leads` key-gated list. Email delivery uses a free/reliable service (Resend free tier or a form-to-email endpoint — chosen in the plan; flagged as the one external dependency). **No SMS unless a real text actually sends.**
- **Assistant polish** (`/find`): clearer prompts, suggested questions, nicer styling, solid empty/error states. No new model risk.

### SEO / PWA / housekeeping
- Per-page `<title>`, meta description, canonical, and Open Graph.
- Update `sitemap.xml` and `robots.txt` for the new pages.
- Update `manifest.json` (start_url stays `/`) and `sw.js` cache list to include new pages; ensure SW serves fresh HTML (network-first for documents) to avoid stale pages after deploy.
- Keep Vercel Web Analytics on every page.
- Preserve `stats.html` + `api/track.js` exactly.

### Constraints (hard)
- Vanilla JS only; progressive enhancement (content readable with JS off).
- ≤ 2 font families; `font-display: swap`; no render-blocking fonts.
- Accessibility: keyboard nav, visible focus, alt text, AA contrast, reduced-motion.
- No external trackers beyond Vercel Analytics. Privacy-light analytics posture preserved.
- Only the lead form and review form intentionally collect input, and only on user action.

---

## 8. Acceptance Criteria (before ANYTHING goes live)

Per page, "ready to show Luke" requires:
- [ ] Renders correctly in **local preview** at desktop AND phone widths.
- [ ] No console errors; content visible with JS disabled.
- [ ] No horizontal scroll; tap targets, type sizes, and contrast meet §6.
- [ ] Nav + sticky Book bar work; hamburger opens/closes; every nav/footer link resolves (no 404s, no dead anchors).
- [ ] Existing capabilities still work: Calendly booking, assistant, review submit, browse, referrals, dashboard.
- [ ] **No placeholder/fake reviews anywhere.**
- [ ] Each page has one clear primary CTA.
- [ ] Lighthouse (or equivalent): **no regression** vs. current live site on Performance / Accessibility / Best-Practices / SEO; ideally improved.

Whole-site gate before go-live:
- [ ] All internal links between pages verified.
- [ ] Recommender, reviews, lead capture tested end-to-end locally (or against a Vercel **preview** deploy, never production).
- [ ] Luke reviews the full preview and **explicitly approves**.

---

## 9. Rollback / Safety Plan

**Live site protection is non-negotiable.** The repo **auto-deploys to cutcowithluke.com on every push to `main`.** Therefore:

1. **Branch isolation:** all work on `upgrade/surgical-polish`. `main` stays as the live site until approval.
2. **Snapshot:** live commit is **`27c26bb`**. Luke's earlier uncommitted WIP is preserved in git **stash** (`pre-upgrade-snapshot`).
3. **Preview safely:** local static server for visual review; for the API-backed features (reviews/leads), use a **Vercel preview deployment** of the branch (separate URL, never the live domain) — Vercel builds previews for non-main branches.
4. **Go-live (only after Luke's approval):** merge `upgrade/surgical-polish` → `main`, push; Vercel deploys in ~20s.
5. **Instant rollback if needed:** Vercel dashboard → promote the previous deployment (seconds); or `git revert` / reset `main` to `27c26bb` and push.
6. **Incremental option:** pages can ship in waves (e.g. structure first, features second), each independently reversible, to de-risk.

---

## 10. Decisions Locked & Remaining Flags

**Locked (per Luke):**
- Multi-page guided conversion system; 6-item nav; recruiting de-prioritized.
- Dark premium style retained; cleaner and more intentional.
- Reviews auto-display; **all placeholder reviews removed now**.
- Leads → email Luke **and** a browsable `/leads` list.
- Build everything, preview, then **go live**.

**Flags to confirm during planning (won't block the spec):**
1. **Email service for leads** — needs one free signup (e.g. Resend) OR a form-to-email endpoint. I'll pick the most reliable free option and confirm before wiring it.
2. **Auto-display reviews** carry inherent spam risk; safeguards above mitigate it, and the private kill-switch lets you hide a bad one without manual pre-approval.
3. **Recruiting placement** — footer link + small `/work` page (not in top nav). Confirm that's the right prominence.
