# Cutco Guided Conversion Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure cutcowithluke.com from one long page into a 6-page guided conversion system (Home hub, Book, Find Your Cutco, Meet Luke, Reviews+Referrals, FAQ+Guarantee, plus footer-only Work), keeping the dark premium style, and add a knife recommender, auto-displayed real reviews, and lead capture — all static, no framework rebuild.

**Architecture:** Plain static multi-page site. One HTML file per page sharing `assets/styles.css` + `assets/app.js`. Pure logic (recommender, validation) lives in `lib/*.js` modules imported by both the browser and Bun tests. Dynamic features (reviews, leads) use small Vercel serverless functions in `api/` backed by Vercel KV, mirroring the existing `api/track.js`. Content is relocated from today's `index.html`, never deleted.

**Tech Stack:** HTML5, CSS (custom properties), vanilla ES-module JS, Vercel static hosting + serverless functions + Vercel KV, Resend (lead emails), Bun test runner for unit tests.

## Global Constraints

Copied verbatim from the spec — every task inherits these:

- **No framework / no build step.** Static HTML/CSS/vanilla JS only. No React/Vue/bundler.
- **Vanilla JS, progressive enhancement.** Page content must render and be readable with JS disabled.
- **≤ 2 font families**, both with `font-display: swap`; fonts must not block render.
- **Accessibility:** keyboard-navigable, visible focus states, alt text on images, WCAG AA contrast, `prefers-reduced-motion` respected.
- **No external trackers** beyond the existing Vercel Web Analytics.
- **Preserve `stats.html` and `api/track.js` exactly.** Do not modify them.
- **Privacy-light:** only the review form and lead form collect input, and only on user action.
- **Dark premium palette retained:** build on existing tokens `--bg --panel --line --ink --mut --cyan --blue --teal --gold --ang`.
- **Clean URLs:** `/book` not `/book.html` via `vercel.json` `cleanUrls: true`.
- **SAFETY — non-negotiable:** all work stays on branch `upgrade/surgical-polish`. **Never push to `main`** (which auto-deploys live) until Luke approves the preview. Live snapshot = commit `27c26bb`.
- **No fakes:** no placeholder reviews shipped; no "we texted you" unless a real text sends.
- **Top nav (6):** Home · Book · Find Your Cutco · Meet Luke · Reviews · FAQ. Recruiting lives in the footer + `/work` only.

---

## File Structure

```
cutco-guy-site/
  index.html            Home (hub)                      [rewrite]
  book.html             Book a Demo (money page)        [new]
  find.html             Find Your Cutco                 [new]
  meet.html             Meet Luke                       [new]
  reviews.html          Reviews + Referrals             [new]
  faq.html              FAQ + Guarantee                 [new]
  work.html             Work With Me (footer-linked)    [new]
  leads.html            Private key-gated leads list    [new]
  stats.html            Analytics dashboard             [UNCHANGED]
  vercel.json           cleanUrls routing               [new]
  assets/
    styles.css          Shared design system            [new]
    app.js              Nav/hamburger, sticky book bar   [new]
    recommender-ui.js   Wires lib/recommender to /find   [new]
    reviews-ui.js       Fetch + render reviews, submit    [new]
    lead-ui.js          Lead form submit handler          [new]
    assistant.js        Assistant UX polish               [new]
  lib/
    recommender.js      Pure: answers -> recommendation   [new]
    validate.js         Pure: review/lead validation      [new]
    store.js            KV wrapper (injectable for tests)  [new]
  api/
    track.js            [UNCHANGED]
    reviews.js          GET list / POST submit            [new]
    lead.js             POST lead -> KV + email           [new]
    leads.js            GET key-gated lead list           [new]
  components/
    header.html         Canonical nav markup (copied)     [new]
    footer.html         Canonical footer markup (copied)  [new]
  tests/
    recommender.test.js                                    [new]
    validate.test.js                                       [new]
    reviews-api.test.js                                    [new]
    lead-api.test.js                                       [new]
    links.test.js       Crawl pages, assert links resolve  [new]
  sitemap.xml robots.txt manifest.json sw.js               [update]
```

**Shared interfaces locked here (every page/task uses these names):**

Design tokens added to `assets/styles.css` `:root` (on top of existing color vars):
```
--fs-sm:.875rem; --fs-base:1rem;
--fs-lg:clamp(1.05rem,1rem+.4vw,1.2rem);
--fs-h3:clamp(1.25rem,1.05rem+1vw,1.6rem);
--fs-h2:clamp(1.6rem,1.2rem+2vw,2.4rem);
--fs-h1:clamp(2.2rem,1.6rem+3.4vw,3.6rem);
--space-1:.5rem; --space-2:.75rem; --space-3:1rem; --space-4:1.5rem;
--space-5:2rem; --space-6:3rem; --space-7:4rem; --space-8:6rem;
--pad-section:clamp(3rem,6vw,6rem);
--radius:14px; --dur:.25s; --ease:cubic-bezier(.2,.7,.2,1);
--measure:68ch;
```
Fonts: body = system stack; display (headings only) = `"Sora"` via Google Fonts with `font-display:swap`. (2 families total.)

Shared JS helper signature (in `assets/app.js`, also unit-tested):
```
activeNav(pathname: string) -> 'home'|'book'|'find'|'meet'|'reviews'|'faq'|''
```

API contracts:
```
GET  /api/reviews            -> 200 { reviews:[{id,name,rating,text,ts}], count }
POST /api/reviews  {name,rating,text,website,ts} -> 200 {ok:true,review} | 400 {ok:false,error}
POST /api/lead     {name,contact,contactType,when,note,website} -> 200 {ok:true} | 400 {ok:false,error}
GET  /api/leads?key=KEY      -> 200 { leads:[...] } | 401
```
(`website` is the honeypot field — must be empty.)

`lib/recommender.js`:
```
recommend(a: {cook:'lots'|'some'|'barely', household:'1'|'2-4'|'5+',
              purpose:'self'|'gift'|'newhome', budget:'starter'|'mid'|'best',
              owns:boolean})
  -> { id:string, title:string, why:string, tier:'starter'|'mid'|'best' }
```

`lib/validate.js`:
```
validateReview(input) -> { ok:boolean, error?:string, clean?:{name,rating,text} }
validateLead(input)   -> { ok:boolean, error?:string, clean?:{name,contact,contactType,when,note} }
```

---

# WAVE 0 — Tooling & Design-System Foundation

### Task 0.1: Bun test harness smoke test

**Files:**
- Create: `package.json` (add `"scripts":{"test":"bun test"}` if not present)
- Test: `tests/smoke.test.js`

**Interfaces:** Produces a working `bun test` command later tasks rely on.

- [ ] **Step 1: Write the failing test**
```javascript
// tests/smoke.test.js
import { test, expect } from "bun:test";
test("bun test runs", () => { expect(1 + 1).toBe(2); });
```
- [ ] **Step 2: Run it, expect PASS**
Run: `bun test tests/smoke.test.js`
Expected: `1 pass, 0 fail`. (If `bun` not found, run the PATH refresh from session setup.)
- [ ] **Step 3: Commit**
```bash
git add package.json tests/smoke.test.js
git commit -m "test: add bun test harness smoke test"
```

### Task 0.2: Shared design system (`assets/styles.css`)

**Files:**
- Create: `assets/styles.css`
- Reference source: existing inline `<style>` in `index.html` (extract reusable rules)

**Interfaces:** Produces the token names + base component classes (`.btn`, `.btn-primary`, `.card`, `.section`, `.container`, `.trust-bar`, `.book-bar`, `.site-header`, `.site-footer`) every page consumes.

- [ ] **Step 1:** Create `:root` with existing color vars + the new type/space tokens listed in "Shared interfaces" above. Add the `@import`/`<link>` for Sora (headings) with `font-display:swap`.
- [ ] **Step 2:** Add base layer: `*{box-sizing:border-box}`, body bg `var(--bg)` color `var(--ink)`, headings use Sora + `--fs-*`, paragraphs `max-width:var(--measure)`, `.container{max-width:1080px;margin-inline:auto;padding-inline:clamp(1rem,4vw,2rem)}`, `.section{padding-block:var(--pad-section)}`.
- [ ] **Step 3:** Add components: buttons (`.btn`,`.btn-primary` cyan/blue gradient, `.btn-ghost`), `.card` (panel bg, `--radius`, subtle border `--line`), focus-visible outline, `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`.
- [ ] **Step 4: Verify** — create a throwaway `assets/_preview.html` linking the stylesheet with one of each component; open it: `start assets/_preview.html`. Confirm dark theme, readable type, visible focus ring on Tab. Delete `_preview.html`.
- [ ] **Step 5: Commit**
```bash
git add assets/styles.css
git commit -m "feat: shared design system tokens + base components"
```

### Task 0.3: Shared chrome + `app.js` (nav/hamburger/sticky bar)

**Files:**
- Create: `components/header.html`, `components/footer.html`, `assets/app.js`
- Test: `tests/app.test.js`

**Interfaces:** Consumes `styles.css` classes. Produces canonical header/footer markup (copied into every page) and `activeNav(pathname)`.

- [ ] **Step 1: Write the failing test for the pure helper**
```javascript
// tests/app.test.js
import { test, expect } from "bun:test";
import { activeNav } from "../assets/app.js";
test("maps paths to nav keys", () => {
  expect(activeNav("/")).toBe("home");
  expect(activeNav("/book")).toBe("book");
  expect(activeNav("/find")).toBe("find");
  expect(activeNav("/reviews")).toBe("reviews");
  expect(activeNav("/unknown")).toBe("");
});
```
- [ ] **Step 2: Run, expect FAIL** — `bun test tests/app.test.js` → fails (no module).
- [ ] **Step 3: Implement `assets/app.js`**
```javascript
export function activeNav(pathname) {
  const p = (pathname || "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const map = { "/":"home", "/index":"home", "/book":"book", "/find":"find",
                "/meet":"meet", "/reviews":"reviews", "/faq":"faq" };
  return map[p] || "";
}
// Browser-only enhancements run when there's a document:
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const key = activeNav(location.pathname);
    document.querySelectorAll("[data-nav]").forEach(a =>
      a.toggleAttribute("aria-current", a.dataset.nav === key));
    const burger = document.querySelector("[data-burger]");
    const menu = document.querySelector("[data-menu]");
    if (burger && menu) burger.addEventListener("click", () => {
      const open = menu.toggleAttribute("data-open");
      burger.setAttribute("aria-expanded", String(open));
    });
  });
}
```
- [ ] **Step 4: Run, expect PASS** — `bun test tests/app.test.js`.
- [ ] **Step 5:** Author `components/header.html`: `<header class="site-header">` with brand link to `/`, a `<nav data-menu>` containing the 6 `<a data-nav="...">` links, a `<button data-burger aria-expanded="false" aria-controls=...>`; and the sticky `<a class="book-bar" href="/book">Book a Demo</a>`. Author `components/footer.html`: contact (email, area served), Work-With-Me link, social, privacy note. Add a top comment in each: `<!-- CANONICAL: edit here, copy into every page -->`.
- [ ] **Step 6: Commit**
```bash
git add assets/app.js components/header.html components/footer.html tests/app.test.js
git commit -m "feat: shared header/footer + nav/hamburger/sticky-bar behavior"
```

---

# WAVE 1 — Page Restructure (content relocation)

> Each page task: start from `git show 27c26bb:index.html` as the content source, move the mapped sections (spec §4), restyle with Wave-0 tokens/components, paste in the canonical header+footer, and end with one clear primary CTA. Verification is identical per page (Step V below), so it's written once here and referenced.

**Step V (per-page verification):**
1. `start <page>.html` — renders dark/premium, no console errors (F12).
2. Resize to 360px width — no horizontal scroll, tap targets feel ≥44px, sticky Book bar visible.
3. Tab through — visible focus, hamburger opens/closes.
4. Disable JS — content still readable.
5. Exactly one primary CTA is obvious.

### Task 1.1: Home (`index.html`)
**Files:** Modify `index.html` (full rewrite into hub).
- [ ] **Step 1:** Build sections in spec §3 order: Hero (brand) → Quick trust bar (guarantee badge + rating placeholder slot + area) → **"What are you here for?" path selector** (5 cards linking /book /find /meet /reviews /faq) → Book preview → Recommender teaser (links /find) → Reviews preview (empty until real reviews; hidden block) → Final CTA. Move full catalog/FAQ/scrapbook OUT.
- [ ] **Step 2:** Insert canonical header + footer; link `assets/styles.css`, `assets/app.js` (`<script type="module">`).
- [ ] **Step 3:** Run **Step V**.
- [ ] **Step 4: Commit** `feat: rebuild Home as conversion hub`.

### Task 1.2: Book (`book.html`)
**Files:** Create `book.html`.
- [ ] **Step 1:** Sections (spec §3 /book): Full Hour vs Quick 20 (one primary, one secondary) → What happens (`howitworks`) → No-pressure (`promise`) → in-person/Meet/Zoom → objection answers (`why`) adjacent to buttons → Calendly **embedded** (`<div>` + Calendly inline-widget script) → How to prepare (`prep`). Lead/reminder form slot (filled Wave 2).
- [ ] **Step 2:** Header/footer/assets; primary CTA = booking.
- [ ] **Step 3:** Run **Step V** + confirm Calendly widget loads.
- [ ] **Step 4: Commit** `feat: add Book a Demo page`.

### Task 1.3: Find (`find.html`) — static shell
**Files:** Create `find.html`.
- [ ] **Step 1:** Sections: intro (`kitchen`/`help`) → recommender mount point `<div id="recommender">` (logic in Wave 2) → intent path chips (My kitchen / Gift / New home / Cook a lot / Barely cook / Already own / Best 1–3 / Full set) → assistant mount `<div id="assistant">` (Wave 2) → product explorer + browse/prices (`explore`+`browse`) → specials block `hidden` (shown only when real special).
- [ ] **Step 2:** Header/footer/assets.
- [ ] **Step 3:** Run **Step V**.
- [ ] **Step 4: Commit** `feat: add Find Your Cutco page shell`.

### Task 1.4: Meet (`meet.html`)
**Files:** Create `meet.html`.
- [ ] **Step 1:** Move `meet, gallery, spain, family, crew, life, philosophy`; trim to trust-not-scrapbook; end with Book CTA.
- [ ] **Step 2-4:** Header/footer/assets; **Step V**; commit `feat: add Meet Luke page`.

### Task 1.5: Reviews (`reviews.html`) — static shell + remove placeholders
**Files:** Create `reviews.html`.
- [ ] **Step 1:** Move `reviews` + `refer`. **Delete every placeholder/sample testimonial.** Add review-list mount `<div id="reviews-list">` with empty-state copy, the review `<form id="review-form">` (name, rating, text, hidden honeypot `website`), and the referral form. Respectful referral note.
- [ ] **Step 2-4:** Header/footer/assets; **Step V**; commit `feat: add Reviews+Referrals page, remove placeholder reviews`.

### Task 1.6: FAQ (`faq.html`)
**Files:** Create `faq.html`.
- [ ] **Step 1:** Move `faq` + `guarantee`; cover the spec §3 question list; use `<details>` accordions (works without JS); end with reassured Book CTA.
- [ ] **Step 2-4:** Header/footer/assets; **Step V**; commit `feat: add FAQ+Guarantee page`.

### Task 1.7: Work (`work.html`) + footer link
**Files:** Create `work.html`; confirm footer links to it.
- [ ] **Step 1:** Move `work`; low-key recruiting; single CTA (contact). Ensure NOT in top nav.
- [ ] **Step 2-4:** Header/footer/assets; **Step V**; commit `feat: add Work With Me page (footer-linked)`.

### Task 1.8: Link-integrity test
**Files:** Create `tests/links.test.js`; create `vercel.json`.
- [ ] **Step 1: Write failing test**
```javascript
// tests/links.test.js
import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
const pages = ["index","book","find","meet","reviews","faq","work"];
test("all internal links resolve to a page file", () => {
  const valid = new Set([...pages, ""]); // "" = "/"
  for (const pg of pages) {
    const html = readFileSync(`${pg}.html`, "utf8");
    const hrefs = [...html.matchAll(/href="(\/[a-z-]*)"/g)].map(m => m[1]);
    for (const h of hrefs) {
      const key = h.replace(/^\//, "");
      expect(valid.has(key)).toBe(true); // /book -> "book", / -> ""
    }
  }
});
```
- [ ] **Step 2: Run, expect FAIL or PASS**; fix any broken internal hrefs until PASS: `bun test tests/links.test.js`.
- [ ] **Step 3:** Create `vercel.json`: `{ "cleanUrls": true, "trailingSlash": false }`.
- [ ] **Step 4: Commit** `test: internal link integrity + cleanUrls routing`.

---

# WAVE 2 — Dynamic Features (TDD)

### Task 2.1: Recommender logic (`lib/recommender.js`)
**Files:** Create `lib/recommender.js`; Test `tests/recommender.test.js`.
**Interfaces:** Produces `recommend(a)` per the contract above.
- [ ] **Step 1: Write failing tests**
```javascript
// tests/recommender.test.js
import { test, expect } from "bun:test";
import { recommend } from "../lib/recommender.js";
test("heavy cook, big household, best budget -> top set", () => {
  const r = recommend({cook:"lots",household:"5+",purpose:"self",budget:"best",owns:false});
  expect(r.tier).toBe("best");
  expect(r.id).toBeDefined(); expect(r.why.length).toBeGreaterThan(10);
});
test("gift + starter budget -> giftable starter", () => {
  const r = recommend({cook:"some",household:"2-4",purpose:"gift",budget:"starter",owns:false});
  expect(r.tier).toBe("starter");
});
test("already owns -> recommends a complement, never a full duplicate set", () => {
  const r = recommend({cook:"some",household:"2-4",purpose:"self",budget:"mid",owns:true});
  expect(r.id).not.toBe("full-set");
});
test("barely cooks -> a small essential, not a full set", () => {
  const r = recommend({cook:"barely",household:"1",purpose:"self",budget:"mid",owns:false});
  expect(r.tier).not.toBe("best");
});
```
- [ ] **Step 2: Run, expect FAIL** — `bun test tests/recommender.test.js`.
- [ ] **Step 3: Implement**
```javascript
// lib/recommender.js
const PIECES = {
  "petite-chef": {title:"Petite Chef + Trimmer starter", tier:"starter",
    why:"The two knives you'll reach for every day — versatile and easy to handle."},
  "santoku-duo": {title:"Santoku + Paring duo", tier:"mid",
    why:"A do-everything pair that covers most kitchen tasks beautifully."},
  "homemaker-set": {title:"Homemaker+8 set", tier:"mid",
    why:"A balanced set that outfits a real cooking kitchen without overkill."},
  "ultimate-set": {title:"Ultimate Set", tier:"best",
    why:"The full lineup for a busy kitchen that cooks a lot — set it and forget it."},
  "gift-trimmer": {title:"Trimmer + Gift Box", tier:"starter",
    why:"A gift people actually keep — useful from day one, backed forever."},
  "complement-knife": {title:"Carver or Bread knife add-on", tier:"mid",
    why:"Fills the gap most Cutco owners are missing — pairs with what you have."}
};
export function recommend(a) {
  let id;
  if (a.owns) id = "complement-knife";
  else if (a.purpose === "gift") id = a.budget === "starter" ? "gift-trimmer" : "santoku-duo";
  else if (a.cook === "barely") id = "petite-chef";
  else if (a.budget === "best" && (a.household === "5+" || a.cook === "lots")) id = "ultimate-set";
  else if (a.cook === "lots" || a.household === "5+") id = "homemaker-set";
  else id = a.budget === "starter" ? "petite-chef" : "santoku-duo";
  return { id, ...PIECES[id] };
}
```
- [ ] **Step 4: Run, expect PASS**. Adjust ruleset only if a test fails (tests are the contract).
- [ ] **Step 5: Commit** `feat: knife/set recommender logic with tests`.

### Task 2.2: Wire recommender into `/find`
**Files:** Create `assets/recommender-ui.js`; Modify `find.html`.
- [ ] **Step 1:** `recommender-ui.js` (ES module) imports `recommend`, renders 5 questions into `#recommender`, on submit shows `{title, why}` + a "Book a demo" button (/book) + "Browse pieces" link. Keyboard accessible; no result until answered.
- [ ] **Step 2:** `<script type="module" src="/assets/recommender-ui.js">` in `find.html`.
- [ ] **Step 3: Verify** — `start find.html`, answer questions, see a sensible result, Book button works. Run **Step V**.
- [ ] **Step 4: Commit** `feat: interactive recommender on Find page`.

### Task 2.3: Validation lib (`lib/validate.js`)
**Files:** Create `lib/validate.js`; Test `tests/validate.test.js`.
- [ ] **Step 1: Write failing tests**
```javascript
// tests/validate.test.js
import { test, expect } from "bun:test";
import { validateReview, validateLead } from "../lib/validate.js";
test("rejects honeypot-filled review", () =>
  expect(validateReview({name:"A",rating:5,text:"Great knives, loved the demo!",website:"bot"}).ok).toBe(false));
test("rejects too-short review text", () =>
  expect(validateReview({name:"A",rating:5,text:"ok",website:""}).ok).toBe(false));
test("rejects link spam in review", () =>
  expect(validateReview({name:"A",rating:5,text:"buy now http://spam.example",website:""}).ok).toBe(false));
test("accepts a clean review and trims", () => {
  const r = validateReview({name:"  Luke ",rating:5,text:"Honestly the best demo, no pressure at all.",website:""});
  expect(r.ok).toBe(true); expect(r.clean.name).toBe("Luke"); expect(r.clean.rating).toBe(5);
});
test("rejects bad rating", () =>
  expect(validateReview({name:"A",rating:9,text:"good enough words here",website:""}).ok).toBe(false));
test("lead needs a contact", () =>
  expect(validateLead({name:"A",contact:"",contactType:"email",when:"evening",website:""}).ok).toBe(false));
test("lead accepts valid email", () => {
  const r = validateLead({name:"A",contact:"a@b.com",contactType:"email",when:"evening",note:"",website:""});
  expect(r.ok).toBe(true);
});
test("lead rejects honeypot", () =>
  expect(validateLead({name:"A",contact:"a@b.com",contactType:"email",when:"x",website:"bot"}).ok).toBe(false));
```
- [ ] **Step 2: Run, expect FAIL**.
- [ ] **Step 3: Implement**
```javascript
// lib/validate.js
const hasLink = s => /(https?:\/\/|www\.|\.\w{2,}\/)/i.test(s);
export function validateReview(i = {}) {
  if (i.website) return { ok:false, error:"spam" };           // honeypot
  const name = String(i.name||"").trim();
  const text = String(i.text||"").trim();
  const rating = Number(i.rating);
  if (name.length < 1 || name.length > 40) return { ok:false, error:"name" };
  if (!(rating >= 1 && rating <= 5)) return { ok:false, error:"rating" };
  if (text.length < 12 || text.length > 600) return { ok:false, error:"length" };
  if (hasLink(text)) return { ok:false, error:"link" };
  return { ok:true, clean:{ name, rating, text } };
}
export function validateLead(i = {}) {
  if (i.website) return { ok:false, error:"spam" };
  const name = String(i.name||"").trim();
  const contact = String(i.contact||"").trim();
  const contactType = i.contactType === "phone" ? "phone" : "email";
  const when = String(i.when||"").trim().slice(0,40);
  const note = String(i.note||"").trim().slice(0,300);
  if (name.length < 1 || name.length > 40) return { ok:false, error:"name" };
  if (contactType === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact))
    return { ok:false, error:"email" };
  if (contactType === "phone" && contact.replace(/\D/g,"").length < 7)
    return { ok:false, error:"phone" };
  return { ok:true, clean:{ name, contact, contactType, when, note } };
}
```
- [ ] **Step 4: Run, expect PASS**.
- [ ] **Step 5: Commit** `feat: review/lead validation + anti-spam with tests`.

### Task 2.4: KV store wrapper + Reviews API
**Files:** Create `lib/store.js`, `api/reviews.js`; Test `tests/reviews-api.test.js`.
**Interfaces:** `store.js` exports `makeStore(kv)` so tests inject an in-memory KV.
- [ ] **Step 1: Write failing test (in-memory KV)**
```javascript
// tests/reviews-api.test.js
import { test, expect } from "bun:test";
import { handleReviews } from "../api/reviews.js";
function memKv(){ const m=new Map(); return {
  async lrange(k,a,b){ const arr=m.get(k)||[]; return arr.slice(a, b===-1?undefined:b+1);},
  async lpush(k,v){ const arr=m.get(k)||[]; arr.unshift(v); m.set(k,arr); return arr.length;} }; }
test("POST valid review stores; GET returns it", async () => {
  const kv = memKv();
  const post = await handleReviews({method:"POST",
    body:{name:"Sam",rating:5,text:"No pressure, super helpful demo.",website:""}}, kv);
  expect(post.status).toBe(200); expect(post.json.ok).toBe(true);
  const get = await handleReviews({method:"GET"}, kv);
  expect(get.json.count).toBe(1); expect(get.json.reviews[0].name).toBe("Sam");
});
test("POST spam (honeypot) is rejected, not stored", async () => {
  const kv = memKv();
  const post = await handleReviews({method:"POST",
    body:{name:"X",rating:5,text:"whatever words here",website:"bot"}}, kv);
  expect(post.status).toBe(400);
  const get = await handleReviews({method:"GET"}, kv);
  expect(get.json.count).toBe(0);
});
```
- [ ] **Step 2: Run, expect FAIL**.
- [ ] **Step 3: Implement `api/reviews.js`** (pure core `handleReviews(req,kv)` + a thin Vercel default export)
```javascript
// api/reviews.js
import { validateReview } from "../lib/validate.js";
const KEY = "reviews:v1";
export async function handleReviews(req, kv) {
  if (req.method === "GET") {
    const reviews = (await kv.lrange(KEY, 0, 49)) || [];
    return { status:200, json:{ reviews, count: reviews.length } };
  }
  if (req.method === "POST") {
    const v = validateReview(req.body || {});
    if (!v.ok) return { status:400, json:{ ok:false, error:v.error } };
    const review = { id: crypto.randomUUID(), ...v.clean, ts: Date.now() };
    await kv.lpush(KEY, review);
    return { status:200, json:{ ok:true, review } };
  }
  return { status:405, json:{ ok:false, error:"method" } };
}
// Vercel adapter:
export default async function (req, res) {
  const { kv } = await import("@vercel/kv");
  const body = req.method === "POST" ? req.body : undefined;
  const out = await handleReviews({ method:req.method, body }, kv);
  res.status(out.status).json(out.json);
}
```
- [ ] **Step 4: Run, expect PASS** — `bun test tests/reviews-api.test.js`.
- [ ] **Step 5: Commit** `feat: reviews API (GET/POST) with KV + tests`.

### Task 2.5: Reviews display + submit on `/reviews`
**Files:** Create `assets/reviews-ui.js`; Modify `reviews.html`.
- [ ] **Step 1:** `reviews-ui.js`: on load `fetch('/api/reviews')` → render cards into `#reviews-list` (or empty-state if `count===0`); on `#review-form` submit → POST, on `ok` prepend the new card + thank-you, on error show inline message. Include hidden honeypot input `website` (CSS-hidden, `tabindex=-1`, `autocomplete=off`).
- [ ] **Step 2:** Wire script into `reviews.html`.
- [ ] **Step 3: Verify** locally with the API (use Wave-3 preview deploy for the live KV, or stub `fetch` returning `{reviews:[],count:0}` to confirm empty-state). Run **Step V**.
- [ ] **Step 4: Commit** `feat: live reviews display + submit form`.

### Task 2.6: Lead API (`api/lead.js`) + leads list API (`api/leads.js`)
**Files:** Create `api/lead.js`, `api/leads.js`; Test `tests/lead-api.test.js`.
- [ ] **Step 1: Write failing test**
```javascript
// tests/lead-api.test.js
import { test, expect } from "bun:test";
import { handleLead } from "../api/lead.js";
function memKv(){ const m=new Map(); return {
  async lpush(k,v){ const a=m.get(k)||[]; a.unshift(v); m.set(k,a); return a.length;},
  async lrange(k,a,b){ const arr=m.get(k)||[]; return arr.slice(a,b===-1?undefined:b+1);} , _m:m }; }
test("valid lead is stored; email sender called", async () => {
  const kv = memKv(); let sent=null;
  const out = await handleLead({method:"POST",
    body:{name:"Pat",contact:"p@x.com",contactType:"email",when:"evening",note:"",website:""}},
    kv, async (lead)=>{ sent=lead; });
  expect(out.status).toBe(200); expect(out.json.ok).toBe(true);
  expect(sent.name).toBe("Pat"); expect((kv._m.get("leads:v1")||[]).length).toBe(1);
});
test("honeypot lead rejected, not stored/sent", async () => {
  const kv = memKv(); let sent=false;
  const out = await handleLead({method:"POST",
    body:{name:"X",contact:"p@x.com",contactType:"email",when:"x",website:"bot"}},
    kv, async ()=>{ sent=true; });
  expect(out.status).toBe(400); expect(sent).toBe(false);
});
```
- [ ] **Step 2: Run, expect FAIL**.
- [ ] **Step 3: Implement `api/lead.js`** (core `handleLead(req,kv,sendEmail)` + Vercel adapter; email via Resend if `RESEND_API_KEY` set, else no-op logged)
```javascript
// api/lead.js
import { validateLead } from "../lib/validate.js";
const KEY = "leads:v1";
export async function handleLead(req, kv, sendEmail) {
  if (req.method !== "POST") return { status:405, json:{ ok:false, error:"method" } };
  const v = validateLead(req.body || {});
  if (!v.ok) return { status:400, json:{ ok:false, error:v.error } };
  const lead = { id: crypto.randomUUID(), ...v.clean, ts: Date.now() };
  await kv.lpush(KEY, lead);
  try { await sendEmail(lead); } catch (e) { /* stored anyway; never block the user */ }
  return { status:200, json:{ ok:true } };
}
export default async function (req, res) {
  const { kv } = await import("@vercel/kv");
  const send = async (lead) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) { console.log("LEAD (no email configured):", lead); return; }
    await fetch("https://api.resend.com/emails", { method:"POST",
      headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
      body: JSON.stringify({ from:"leads@cutcowithluke.com", to:"lukeghansen06@gmail.com",
        subject:`New lead: ${lead.name}`,
        text:`${lead.name}\n${lead.contactType}: ${lead.contact}\nWhen: ${lead.when}\nNote: ${lead.note}` }) });
  };
  const out = await handleLead({ method:req.method, body:req.body }, kv, send);
  res.status(out.status).json(out.json);
}
```
- [ ] **Step 4:** Implement `api/leads.js`: GET, require `?key=` to equal `process.env.LEADS_KEY`; if mismatch → `{status:401}`; else return `{ leads: await kv.lrange("leads:v1",0,199) }`.
- [ ] **Step 5: Run, expect PASS** — `bun test tests/lead-api.test.js`.
- [ ] **Step 6: Commit** `feat: lead capture API + key-gated leads API with tests`.

### Task 2.7: Lead form (`/book`) + private leads page (`leads.html`)
**Files:** Create `assets/lead-ui.js`, `leads.html`; Modify `book.html`.
- [ ] **Step 1:** Add `<form id="lead-form">` to `book.html` (name, contact, contactType radio email/phone, preferred reminder time, optional note, hidden honeypot `website`). `lead-ui.js` POSTs to `/api/lead`, shows success/error inline.
- [ ] **Step 2:** `leads.html`: reads `?key=` from URL, `fetch('/api/leads?key='+key)`, renders the list or a "bad key" message (mirror the `stats.html` key pattern).
- [ ] **Step 3: Verify** form UX locally; full end-to-end on the Wave-3 preview deploy.
- [ ] **Step 4: Commit** `feat: lead form on Book + private leads page`.

### Task 2.8: Assistant polish (`/find`)
**Files:** Create `assets/assistant.js`; Modify `find.html`.
- [ ] **Step 1:** Reuse the existing assistant logic from `27c26bb:index.html` (`#assistant`); improve UX only: suggested-question chips, clear empty/error states, styled with design tokens, keyboard accessible. No new backend/model.
- [ ] **Step 2: Verify** assistant answers + suggested questions work. Run **Step V**.
- [ ] **Step 3: Commit** `feat: polish AI assistant UX on Find page`.

### Task 2.9: Trust signals at booking CTAs
**Files:** Modify `index.html`, `book.html` (+ `assets/styles.css` for `.trust-badge`).
- [ ] **Step 1:** Add a reusable trust cluster (Forever Guarantee badge + star-rating summary pulled from `/api/reviews` count/avg + one real review when available) adjacent to each primary Book button. Hidden gracefully when no real reviews yet.
- [ ] **Step 2: Verify**; commit `feat: trust signals beside booking CTAs`.

---

# WAVE 3 — SEO / PWA / Performance / Preview

### Task 3.1: Per-page metadata + sitemap
**Files:** Modify all `*.html`; `sitemap.xml`, `robots.txt`.
- [ ] Add unique `<title>`, meta description, canonical (`https://cutcowithluke.com/<path>`), and Open Graph per page. List all 6 public pages in `sitemap.xml`; confirm `robots.txt` allows them and points to the sitemap. Verify each `<title>` is unique. Commit `feat: per-page SEO metadata + sitemap`.

### Task 3.2: PWA freshness
**Files:** Modify `manifest.json`, `sw.js`.
- [ ] `start_url:"/"`; update `sw.js` to **network-first for navigations/documents** (so new pages aren't served stale after deploy), cache static assets (`/assets/*`) cache-first. Test in browser: load, deploy-sim by editing a page, confirm refresh shows new content. Commit `fix: SW network-first documents + updated cache list`.

### Task 3.3: Image optimization
**Files:** `*.webp` assets, all `*.html` `<img>`.
- [ ] Ensure photos are `.webp`; add explicit `width`/`height`; `loading="lazy"` + `decoding="async"` below the fold; hero eager. Re-export oversized `originals/*` if any image > ~250KB. Commit `perf: optimized, dimensioned, lazy images`.

### Task 3.4: Quality gate (Lighthouse + a11y + mobile)
- [ ] For each page run Lighthouse (Chrome DevTools) at mobile preset. Record scores; fix any **regression** vs. current live site on Performance/Accessibility/Best-Practices/SEO (target ≥ live, ideally 90+). Re-run `bun test` (all green). Verify acceptance criteria (spec §8) per page. Commit any fixes `perf/a11y: quality-gate fixes`.

### Task 3.5: Vercel preview deploy + end-to-end
- [ ] Push the branch (NOT main): `git push -u origin upgrade/surgical-polish`. Confirm Vercel builds a **preview URL** (not the live domain). On that preview, set env vars (`RESEND_API_KEY`, `LEADS_KEY`) and test end-to-end: submit a review (appears), submit a lead (email arrives + shows on `/leads?key=...`), recommender, all nav/links, mobile. Capture the preview URL for Luke.

---

# WAVE 4 — Go-Live (gated on Luke's approval)

### Task 4.1: Final review with Luke
- [ ] Send Luke the preview URL + acceptance-criteria checklist (spec §8). Walk through on desktop + phone. **Do not proceed without explicit approval.**

### Task 4.2: Promote to production
- [ ] On approval: `git checkout main && git merge --no-ff upgrade/surgical-polish && git push`. Vercel deploys (~20s). Verify cutcowithluke.com live: every page, forms, mobile, dashboard (`/stats.html`) still works.
- [ ] **Rollback ready:** if anything is wrong, Vercel dashboard → promote previous deployment, OR `git revert -m 1 <merge> && git push`. Snapshot = `27c26bb`.
- [ ] Commit/tag `release: guided conversion site v1 live`.

---

## Self-Review (completed)

- **Spec coverage:** Sitemap §2 → Wave 1 tasks 1.1–1.7 + leads (2.7). Page plans §3 → 1.1–1.7. Content map §4 → each page task names its source sections. Conversion §5 → path selector (1.1), sticky bar (0.3), trust signals (2.9). Mobile §6 → Step V every page + 3.4. Tech §7 → Wave 0 + APIs (2.4/2.6) + 3.1/3.2/3.3. Features → recommender (2.1/2.2), reviews (2.4/2.5), leads (2.6/2.7), assistant (2.8). Acceptance §8 → Step V + 3.4 + 4.1. Rollback §9 → 3.5 + 4.2. **No gaps.**
- **Placeholder scan:** logic/API/test steps contain full code; page steps name exact sections, tokens, mounts, and the shared Step V verification. No "TBD/add error handling/write tests for the above."
- **Type consistency:** `recommend()`, `validateReview/validateLead`, `handleReviews(req,kv)`, `handleLead(req,kv,sendEmail)`, `activeNav()`, KV keys (`reviews:v1`, `leads:v1`), honeypot field `website`, and API shapes match across all tasks and the interfaces block.
