# CutcoWithLuke — Sales OS Full Upgrade Plan

_Master plan for turning cutcowithluke.com into a premium personal-brand sales operating
system. Written 2026-07-02. Owner: Luke Hansen. Executor: Claude (Fable 5)._

---

## 1. Core thesis

The site already has honest bones: real prices labeled as snapshots, moderated reviews,
a working Finder, and clean privacy gating. What it lacks is a **system**: visitors are
not routed by situation, trust is asserted ("zero pressure" ×6) instead of demonstrated,
follow-up depends on memory, and Luke has no private view of who is hot right now.

Upgrade principle: **a trusted local concierge, not a desperate sales page.**
Premium = consistency, restraint, specificity, real proof, fast mobile, easy contact,
clear next steps. Build mechanisms, not hype.

## 2. Current site diagnosis

Strengths: honest price language enforced by copy-guard audit; 89-piece explorer with
real photos; SPIN-adjacent Finder with ranked results; owner/gift/referral pages exist;
Owner No-Track + Vercel Analytics gating tested; ops agent with report-only CI.

Weaknesses: "no pressure" repeated up to 6×/page (protests too much); /book splits
attention across competing CTAs while both booking paths hit the same 30-min Calendly;
lead-form success is a dead end; /gift /owners /referred are thin brochures, not
concierge flows; stats dashboard counts events but recommends nothing; no attribution
from path → booking; family members' identifying details on /meet.

## 3. P0 trust bugs

| Bug | Status |
|---|---|
| Calendly mismatch (Full Hour + Quick 20 → same 30-min event) | **BLOCKED** — Luke's Calendly has exactly one public event (`/30min`, verified via API). Site structured for a 2-line swap when `FULL_HOUR_CALENDLY_URL` + `QUICK_20_CALENDLY_URL` exist. |
| Inconsistent email | Fix: normalize to `lukehansen01@gmail.com` sitewide (22 files, incl. api/lead.js notification target). |
| Empty Reviews page/nav liability | Nav already removed (P0-4 comments, all 19 pages). Keep route live, make empty state honest, don't promote. |
| Bad icon choices | No gun emoji remains. Reduce sales-page emoji density ~70%; keep personality on /meet. |
| Product count mismatch | 89 is correct and consistent (89 products ↔ 89 SKUs ↔ 89 images). Render /find counts dynamically from catalog data; keep static 89 as no-JS fallback. |
| "Zero pressure" overuse | Max 1 per page; replace with mechanisms (see §5). |

## 4. Demo-generation strategy

- /book: one primary choice (Full Experience), one quieter secondary (Quick 20).
- Demo Preview Theater: what the first 5 minutes look like, what Luke asks, what you
  see, how pricing is handled, what happens if you buy nothing, video vs in-person,
  how to prepare. Certainty sells the appointment.
- Every major page ends with exactly one clear next step, not three.
- Post-submit lead confirmation becomes a bridge: what happens next + text-me-now.

## 5. Connection / trust strategy

Replace claims with mechanisms:
- "you decide what fits" / "the demo narrows options so you don't guess or overbuy"
- "prices are snapshots — confirm current pricing on cutco.com or with me"
- "What I will never do" list on /meet + homepage trust layer.
Calm, mature, local, specific. One "no pressure" max per page.

## 6. Referral strategy

/referred personalization (`?from=Name`, sanitized, graceful fallback), copyable intro
scripts (who to intro + how), referrer promise ("I reach out once, mention your name,
and never chase"), /thanks = two 60-second favors (review → then referral), share
button. Track `referral_intro_copied`, `referral_path_selected`.

## 7. Gift strategy

/gift becomes a concierge: situation cards (wedding, grad, new home, parents, host,
holidays, has-everything, moving out, family upgrade, existing owner) — each with what
matters, what to avoid, best next step, Text-Luke-with-gift-context. Bridge to referral
("intro me to the recipient"). No invented prices.

## 8. Owner-service strategy

/owners becomes a service hub: scenarios (sharpening, inherited, missing pieces,
replacements, new kitchen, gift-for-owner, what-set-do-I-have, send-a-photo). Service
first, purchase later. Photo flow = text a photo via SMS (no new storage/secrets; a
structured upload API is documented as future-optional). Quiet no-track trust line.

## 9. Product discovery / Finder strategy

Explorer stays the catalog workhorse (loads full catalog on first paint — already true).
"Text my list to Luke" stays the hero action. Add situation filters (starter, gift,
owner upgrade, small kitchen, serious cook, etc.) as quick-pick chips over the existing
search index — no new data structures. Compare-table deferred (see §20).

## 10. SPIN Finder strategy

Existing quiz ≈ Situation questions. Add one **Problem** question ("What's most
annoying right now?") that sharpens the result copy, and render **Implication /
Need-payoff** on the result card: why this fits, why not the bigger option, why not
the smaller option, who should skip it, best next step. Keep it 6 questions max —
short beats thorough.

## 11. Challenger insight strategy

Small "insight cards" (one per page max, distinct copy) on /, /find, /book, /gift,
/owners, /referred, /faq. Teach → reframe → route: each card ends in Finder / Text /
Book. No repetition, no hype.

## 12. Booking attribution strategy

- Persist `?ref=`, `?from=`, and UTMs in sessionStorage (first-party only).
- Calendly links gain `utm_source=cutcowithluke&utm_medium=website&utm_campaign=demo&utm_content=<placement>`.
- Track `booking_path_clicked` + `calendly_clicked` with placement labels.
- Never attach user-entered text to URLs.

## 13. Speed-to-lead strategy

/stats gains a Hot-Leads-Now card: recent high-intent events (book/send/lead types)
bucketed by age — Respond now (<1h) / Warm (<24h) / Cooling (<3d) / Cold. Timestamps
only; no PII beyond what the private, key-gated dashboard already shows.

## 14. Stats / next-best-action strategy

Client-side heuristics over existing `/api/track` aggregates: gift-path spikes → send
gift referrals; finder-completes high but bookings low → improve result CTA; owner
clicks high → promote sharpening; referral copies low → move prompt. Weekly 5-number
digest (visits, finder completes, book clicks, sends, leads-proxy). No new API surface.

## 15. AI sidekick strategy

Label it as an AI assistant (not Luke), add visible disclaimer, add intents: skeptic,
referred-visitor, full-vs-quick chooser, small-kitchen, "what should I text Luke".
Topic-category analytics only (`ai_question_topic`: price/guarantee/gift/owner/
product/booking/skeptic/referral/other) — never message contents.

## 16. Privacy / no-track strategy

All new events flow through the existing `track()` guards (`__cutcoNoTrack`).
Vercel Analytics stays gated by `analyticsAllowedFrom()` (no-track + DNT). New events
carry no PII. Admin routes stay excluded. No new storage.

## 17. Accessibility / mobile strategy

Tap targets ≥24px, visible focus states, no horizontal overflow, reduced-motion
respected (already largely true), labels/aria on all new controls, sticky-bar
safe-area inset + never covering forms (hide when a form/Calendly is in view).

## 18. SEO / schema strategy

Add WebSite + Person schema (accurate only), keep existing FAQPage/LocalBusiness
schema in sync with visible copy. No review/rating markup until real visible reviews
exist. BreadcrumbList skipped (flat site, low value).

## 19. Features to build now

P0 fixes; /book hierarchy + Demo Preview Theater; hero Text-Luke CTA; sticky-bar
polish; copy restraint pass; FAQ pricing/availability + objection engine; Sales Path
Engine ("Start with your situation"); SPIN Finder 2.0; insight cards; /meet trust
layer + privacy trim; Gift Concierge; Owner Hub; Referral Engine 2.0 (+/thanks);
explorer situation filters; sidekick concierge; booking attribution; stats sales
intelligence + follow-up drafts; EVENT_MAP.md; schema/accessibility pass.

## 20. Features to reject

Fake review walls · fake "most popular" labels · countdown timers · fake urgency ·
AI voice clone · auto-texting customers · public lead dashboard · price auto-updates
without manual approval · heavy libraries for tiny visuals · 3D/AR viewers ·
newsletter popups · casino/app gamification. **Deferred (not rejected):** My-List
compare table (needs design space; documented in §9), owner photo-upload API (needs
storage + secrets decision), vCard refresh beyond consistency check.

## 21. Files likely affected

`index, book, find, faq, gift, owners, referred, thanks, meet, reviews, work, card,
privacy` + 5 town pages (nav/footer/email consistency only) · `components/header,
footer` · `assets/app.js, assistant.js, explorer.js, recommender.js, recommender-ui.js,
styles.css` · `stats.html` · `api/lead.js` (email target only) · `sw.js` (cache) ·
`docs/SALES_OS_FULL_UPGRADE_PLAN.md, docs/EVENT_MAP.md`.

Not touched: KV/auth logic, ops safety gates, workflows, prices/images/SKUs, secrets,
`_old-singlepage/`, handoff docs, `growth/`.

## 22. Test plan

`bun test` (30 tests must stay green; recommender/no-track/app exports preserved) →
`npm run preflight` (12 checks) → `npm run ops:safe` → `npm run audit:all`-equivalent
(links, seo, events, copy-guard, cache-bump, api-health). Manual: every public route
loads; /stats gate works; explorer shows catalog on load; My List + SMS drafts work;
no "live price" wording; count consistency; sticky bar vs forms; no-track behavior.

## 23. Push / deploy checklist

1. `git status` — only intended files (never handoff docs / growth/).
2. All tests + audits green. sw.js CACHE bumped (v11 covers this working tree).
3. Luke reviews this plan + the diff + final report.
4. **Luke explicitly says "commit"/"push"** — until then, nothing is committed,
   pushed, or deployed.
5. After deploy: verify live routes, run the manual checklist, confirm Calendly links
   once the 60/20 events exist.

### Blocked items waiting on Luke
- `FULL_HOUR_CALENDLY_URL` (60-min event) and `QUICK_20_CALENDLY_URL` (20-min event).
  Calendly currently exposes only `calendly.com/lukehansen01/30min` ("Cutco Demo").
- Referrer promise copy ("I reach out once, mention your name, and never chase") —
  ship only if Luke confirms it's true. Shipped commented-out pending confirmation.
