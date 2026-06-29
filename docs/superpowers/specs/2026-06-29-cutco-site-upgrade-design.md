# Cutco Site Upgrade — Design Spec

**Date:** 2026-06-29
**Project:** cutco-guy-site (cutcowithluke.com)
**Owner:** Luke Hansen
**Approach:** Surgical Polish + High-Impact Features (no rebuild)
**Status:** Awaiting Luke's review before any live-site changes

---

## 1. Scope

### In scope
Upgrade the existing single-page dark site (`index.html`, ~2,100 lines) to feel **more premium, faster, more trustworthy, and more conversion-focused** — while keeping the current dark aesthetic, brand voice, and overall page structure.

Work happens in three phases:
1. **Premium polish** (visuals, typography, spacing, motion, mobile, speed)
2. **Conversion** (sticky mobile booking, trust signals, cleaner booking options, review placement)
3. **Features** (knife/set recommender → testimonial capture/display → assistant polish → lead capture)

### Explicitly OUT of scope (YAGNI)
- No framework rebuild (no React/Vue/build step). Stays a static single-page site.
- No redesign of the brand, color identity, or section order beyond what improves clarity.
- No new backend beyond the existing `api/track.js` pattern, unless a feature truly needs it (lead capture — see §6).
- No feature that doesn't serve: **trust, speed, booking, referrals, reviews, or product clarity.** If it doesn't, it gets cut.
- No gimmicks, no "AI-generated clutter," no decorative noise.

### Guiding principle
The site already works and looks good. Every change must make it *measurably* cleaner, faster, or more persuasive — never just "different."

---

## 2. Conversion Goals (the point of all this)

Primary actions we want more of, in priority order:
1. **Book a demo** (Calendly — Full or Quick)
2. **Leave a review** (existing review form)
3. **Refer someone** (existing referral section)
4. **Understand the product** quickly (quiz/recommender, assistant, browse)

Design implications:
- A booking call-to-action should be reachable within **one tap/scroll from anywhere**, especially on mobile.
- Every booking button sits next to a **trust signal** (guarantee badge, star rating, or a real review).
- Copy must repeatedly and plainly reassure: **no pressure, easy, free, you're in control.**
- Reduce decision friction: one obvious primary action per section; secondary actions visually quieter.

Success looks like: a first-time mobile visitor understands who Luke is, trusts him, and can book in under ~20 seconds without hunting.

---

## 3. Phase-by-Phase Checklist

### Phase 1 — Premium Polish (looks + speed + mobile)
- [ ] **Typography:** consistent type scale (clamp-based sizes), refined heading font/weights, consistent line-height and measure (line length). No more than 2 font families.
- [ ] **Spacing rhythm:** standardize section padding and vertical rhythm via CSS variables; remove inconsistent gaps.
- [ ] **Color/contrast pass:** keep the dark palette (`--bg #070b14`, cyan/blue/teal/gold accents); verify WCAG AA contrast on text and buttons.
- [ ] **Motion polish:** smoother scroll-reveal, subtle hero motion, refined hover/focus states; everything wrapped in `prefers-reduced-motion` guard.
- [ ] **Image handling:** ensure all photos are `.webp` where possible, add explicit `width`/`height` (prevent layout shift), `loading="lazy"` + `decoding="async"` on below-the-fold images, keep hero eager.
- [ ] **Speed:** defer non-critical inline scripts, minify-friendly cleanup, audit the 5 inline `<script>` blocks, ensure no render-blocking work.
- [ ] **Mobile layout:** full audit (see §5).
- [ ] **Cleanup:** remove dead/duplicate CSS, unused rules, and any clutter that reads as over-built.

### Phase 2 — Conversion
- [ ] **Sticky mobile "Book a Demo" bar:** fixed bottom bar on phones, one primary tap → Calendly; hides on desktop; dismissable-but-returns; doesn't cover key content.
- [ ] **Cleaner Full Demo / Quick Demo options:** redesign the two-option booking block so the difference is instantly clear; one primary, one secondary.
- [ ] **Trust signals near booking:** guarantee badge + star-rating summary + one real short review adjacent to each main booking CTA.
- [ ] **Review placement:** surface 1–2 strong testimonials right before/around booking sections (social proof at the decision point).
- [ ] **Reassurance copy:** add concise "no pressure / free / 15-min / you choose" microcopy near CTAs.

### Phase 3 — Features (in this priority order)
- [ ] **1. Knife/Set Recommender:** short, friendly quiz (3–5 questions: how you cook, household size, budget feel, gift vs self) → recommends a sensible *starting point* (a piece or set) with a one-line why and a book/browse CTA. Simple, not gimmicky. Upgrades/replaces the current `#quiz` "find your starting point."
- [ ] **2. Testimonial capture + display:** existing review form feeds a display area so submitted reviews actually appear on the page (with light moderation/approval so nothing spammy shows publicly).
- [ ] **3. AI Assistant polish:** improve `#assistant` UX (clearer prompts, nicer styling, better empty/error states, suggested questions) — no model/back-end risk introduced.
- [ ] **4. Reminder / lead capture:** see §6 — collect name + phone/email + preferred reminder time, deliver to Luke by email or a simple list. **No fake SMS.**

Each phase ends in a **local preview** Luke reviews before we even consider pushing.

---

## 4. Implementation Constraints (exact)

- **Single-page, static.** All work stays in `index.html` + existing assets. No build tooling, no npm framework deps, no bundler.
- **Inline-CSS-first.** The site uses one inline `<style>` block and CSS custom properties (`--bg --panel --line --ink --mut --cyan --blue --teal --gold --ang`). New styles extend these variables; do not introduce a competing system or external CSS framework.
- **Vanilla JS only.** Existing behavior is plain inline JS (5 blocks). New interactivity stays vanilla, progressive-enhancement style (page must still render/scroll if JS fails).
- **Fonts:** at most one self-hosted/Google web font for display + system stack for body. Must be `font-display: swap` and not block render.
- **Accessibility:** keyboard-navigable, visible focus states, alt text on images, `prefers-reduced-motion` respected, AA contrast.
- **No external trackers** beyond the existing Vercel Web Analytics.
- **Backend:** reuse the `api/track.js` (Vercel function + KV) pattern only if needed; lead capture may add one small serverless function or use a form-to-email service (decided in §6).
- **Privacy:** keep the existing "privacy-light, no names/IPs stored" posture for analytics. Lead capture is the only place that intentionally collects contact info, and only with the visitor's action.
- **Preserve the dashboard:** `stats.html` + `api/track.js` keep working unchanged.

---

## 5. Mobile Requirements

Mobile is the primary audience. Every change is checked on a phone-width viewport first.

- [ ] No horizontal scroll at any width ≥ 320px.
- [ ] Tap targets ≥ 44×44px; adequate spacing between tappable items.
- [ ] Body text ≥ 16px effective; headings scale with `clamp()`.
- [ ] Sticky "Book a Demo" bar present, thumb-reachable, never covers content it shouldn't.
- [ ] Images sized responsively, no layout shift on load (explicit dimensions).
- [ ] Forms (review, lead capture) usable one-handed; correct input types (`tel`, `email`) and autocomplete.
- [ ] Fast first paint on a mid-tier phone; no heavy blocking scripts.
- [ ] Animations subtle on mobile and disabled under reduced-motion.

---

## 6. Reminder / Lead-Capture Decision

**Chosen: safest lightweight version first.**
- Collect: **name, phone OR email, preferred reminder time**, optional note.
- Delivery: send the lead to Luke by **email** (or store in a simple list/log Luke can check). Implementation candidates, cheapest/most reliable first:
  1. A static-friendly **form-to-email** service (e.g. a free form endpoint) — zero backend risk.
  2. Or a small **Vercel serverless function** mirroring the `api/track.js` pattern that emails/stores the lead.
- **No fake SMS.** We do not display "we texted you" unless a real text is actually sent.
- Real SMS only added later *if* it's genuinely easy, free/cheap, and reliable. A clean working email/list capture is the priority over a fragile texting setup.

---

## 7. Files / Components Likely to Change

| File | Change |
|------|--------|
| `index.html` | Main work: typography, spacing, motion, mobile, sticky CTA, trust signals, recommender, testimonial display, assistant polish, lead-capture form. |
| `index.html` `<style>` block | New/standardized CSS variables, type scale, spacing tokens, component styles. |
| `index.html` `<script>` blocks | Recommender logic, sticky-bar behavior, testimonial render, lead-capture submit, assistant UX. |
| image assets (`*.webp`, `originals/*`) | Possibly re-export/compress; ensure webp + dimensions. New favicon untouched. |
| `api/` (maybe new `api/lead.js`) | Only if lead capture uses a serverless function. |
| `manifest.json` / `sw.js` | Light touch only if needed for PWA/caching correctness; otherwise untouched. |
| `stats.html`, `api/track.js` | **Untouched** (dashboard preserved). |
| `docs/superpowers/specs/...` | This spec + the implementation plan. |

A separate implementation plan (next step) will break these into ordered, individually-reviewable tasks.

---

## 8. Acceptance Criteria (before ANYTHING goes live)

A phase is "ready to show Luke" only when:
- [ ] It renders correctly in a **local preview** at desktop AND phone widths.
- [ ] No console errors; page works with JS disabled (content still visible).
- [ ] No horizontal scroll; tap targets and contrast meet §5.
- [ ] Existing features still work (booking links, assistant, review form, browse, referrals, dashboard).
- [ ] Lighthouse (or equivalent) shows **no regression** in Performance/Accessibility/Best-Practices/SEO vs. the current live site; ideally an improvement.
- [ ] Visual diff is an obvious upgrade, not just a change.

Nothing is pushed to `main` (i.e., goes live) until **Luke reviews the local preview and explicitly approves.**

---

## 9. Rollback / Safety Plan

**Live site protection is non-negotiable.** Facts:
- The repo **auto-deploys to cutcowithluke.com on every push to `main`.**
- Therefore: **all work happens on the `upgrade/surgical-polish` branch. We never push to `main` until Luke approves.**

Safeguards:
1. **Branch isolation:** working branch is `upgrade/surgical-polish`. `main` stays exactly as the live site until approval.
2. **Snapshot:** current live commit is **`27c26bb`** ("Update Cutco site"). Luke's earlier uncommitted WIP is preserved in a git **stash** (`pre-upgrade-snapshot`).
3. **Local preview only:** review via a local static server / opened file. No deploy happens from previewing.
4. **Go-live procedure (only after approval):** merge `upgrade/surgical-polish` → `main`, then push. Vercel re-deploys in ~20s.
5. **Instant rollback options if anything looks wrong after go-live:**
   - **Vercel dashboard:** promote the previous deployment back to production (one click, ~seconds). OR
   - **Git:** `git revert` the merge / reset `main` to `27c26bb` and push.
6. **Incremental go-live (optional):** phases can go live one at a time, each reversible on its own, to de-risk.

---

## 10. Open Questions for Luke

1. Lead capture delivery: email is fine, or do you also want it logged somewhere you can browse (e.g. the existing dashboard style)?
2. Testimonials: should submitted reviews show publicly **only after you approve each one** (recommended), or auto-show?
3. Any section you'd like trimmed or merged for clarity (28 sections is a lot)? Or leave structure as-is and just polish?
