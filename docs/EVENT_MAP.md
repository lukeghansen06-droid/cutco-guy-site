# Event Map — cutcowithluke.com analytics

_Single source of truth for every analytics event. Updated 2026-07-02 (Sales OS upgrade)._

## How tracking works (applies to every event below)

- **Transport:** `navigator.sendBeacon('/api/track')` with `{ t: <type>, l: <label> }`.
  Click events use `data-ev="<label>"` attributes handled centrally in `assets/app.js`
  (type `ev`); a few view/typed events send beacons directly.
- **Owner No-Track:** every sender checks `window.__cutcoNoTrack` first, and the
  server (`api/track.js`) additionally drops events from admin/local/keyed referers.
  **All events below are excluded for no-track devices — no exceptions.**
- **Vercel Web Analytics:** separate system, injected by `app.js` only when
  `analyticsAllowedFrom()` passes (no-track off AND browser DNT off). None of the
  events below go to Vercel; they go only to the private KV-backed `/api/track`.
- **Storage:** Vercel KV key `analytics`, capped at the most recent 4,000 events.
  Labels are clipped to 120 chars and `<>` stripped server-side.
- **Privacy:** no message contents, no names/emails/phones, no keys, no free text
  from visitors. Labels are fixed strings from our own markup or product names.
- **Dashboard:** everything is aggregated for the key-gated `/stats` page only.

## Event types (server-validated `t` values)

`add` · `view` · `ask` · `cat` · `search` · `quiz` · `book` · `send` · `page` · `ev`

Unknown types are silently ignored by `api/track.js`.

## Label families (type `ev` unless noted)

| Label / family | Page(s) | Trigger | Why it matters | Used in /stats |
|---|---|---|---|---|
| `page` (type) | /find | page load | traffic baseline | KPIs, funnel |
| `add` (type, label=product) | /find | Add to My List | product interest | Top pieces |
| `view` (type, label=product) | /find | official-link click | product interest | Top pieces |
| `ask` (type, label=question) | /find sidekick | question typed (text stored; visitor-typed, no identity) | demand signals | Questions card |
| `cat` / `search` (types) | /find | category pick / typed search | discovery patterns | Top categories/searches |
| `send` (type) | /find drawer | list texted/shared | **hot lead** | Hot leads, digest |
| `book` (type) | any | calendly-text link click | **hot lead** | Booking gauge |
| `path_*` (`path_see_knives`, `path_new_to_cutco`, `path_best_pieces`, `path_gift`, `path_owner`, `path_sharpening`, `path_new_home`, `path_north_shore`, `path_depauw`, `path_referred`, `path_comparing`, `path_skeptical`) | home | situation card click (= `path_selected`) | which lanes convert | source signals |
| `hero_book_click`, `book_full_click`, `book_quick_click`, `mobile_sticky_book_click`, `booking_path_clicked`, `calendly_clicked` | many | booking CTA clicks (placement = label) | booking attribution | Booking sources, Hot leads |
| `text_luke_click` | many | any Text-Luke CTA | speed-to-lead signal | Hot leads |
| `gift_path_selected`, `gift_finder_click` | /gift | occasion card / gift CTA | gift demand | next-action heuristics |
| `owner_service_click`, `owner_photo_click` | /owners, /thanks | owner help / photo CTA | service demand | next-action heuristics |
| `referral_intro_copied`, `referral_path_selected`, `referral_copy_intro` | /referred, /thanks, /gift, /reviews | intro copied / referral lane | referral engine health | Referral signals |
| `demo_preview_viewed` | /book | Demo Preview Theater scrolled into view | education depth | (raw feed) |
| `find_quiz_start`, `find_quiz_complete`, `find_quiz_reset`, `perfect_match_seen` | /find | finder lifecycle (= `finder_started`/`finder_completed`) | funnel core | Funnel, digest |
| `find_quiz_send_to_luke`, `book_with_result_click`, `quiz_add_product_to_list`, `price_check_text_luke`, `keep_browsing_products` | /find result | result-card actions (= `finder_result_texted`) | result CTA health | next-action heuristics |
| `product_filter_used` | /find | quick-pick chip click | discovery UX | (raw feed) |
| `my_list_text_luke`, `my_list_clear`, `explorer_add_to_list`, `official_cutco_link_click` | /find | list/drawer actions (= `list_text_clicked`/`list_sent`) | list engine health | Hot leads |
| `faq_objection_opened` | /faq | accordion opened (once per question/pageview) | objection heat | (raw feed) |
| `ai_topic_<cat>` (`price|guarantee|gift|owner|product|booking|skeptic|referral|other`) | /find sidekick | message sent — **category only, never contents** (= `ai_question_topic`) | what people ask about | AI digest |
| `assistant_*` (`assistant_open`, `assistant_message_send`, `assistant_quick_chip_click`, `assistant_text_luke_click`, `assistant_book_click`, `assistant_start_finder_click`, `assistant_price_check_click`) | /find | sidekick interactions | assistant health | (raw feed) |
| `thanks_review_click`, `share_click`, `save_contact_click` | /thanks, /card | post-demo favors | referral engine | Referral signals |
| `knife_audit_text_luke` | /find | knife-drawer photo CTA | lead magnet health | Hot leads |
| `insight_finder_click` | home, /find | insight-card CTA | insight card ROI | (raw feed) |
| `review_submitted` / `lead_form_submit` | — | **not events**: real submissions live in KV (`reviews:pending`, `leads:v1`) and email — higher-trust records than analytics | — | counts via /api/admin-ops |

## Attribution context (not events)

- `?ref=`, `?from=`, `utm_*` are persisted to `sessionStorage.cutcoAttrib`
  (sanitized, 60-char cap) by `app.js`. First-party only; never re-broadcast.
- Calendly links get `utm_source=cutcowithluke&utm_medium=website&utm_campaign=demo&utm_content=<placement>`
  added by `app.js` (placement from `data-utm` or page name). Calendly reports these
  on each booking, which is the real booking-source report.
- Path lane stored at `sessionStorage.cutcoPath` via `data-path` attributes.

## Never tracked

Private message contents · stats/admin keys · names/emails/phones in analytics ·
anything from no-track devices · private dashboard views (admin routes are
excluded client-side AND server-side).
