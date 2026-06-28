# Auto Research Engineer — Instructions  (HUMAN-OWNED: only Luke edits this)

## Goal (plain English)
Make the cutcowithluke.com homepage **load as fast as possible**. A faster site = better
first impression, better mobile experience, better SEO, and more people actually reaching
the "Book" button before bouncing.

## The single number we optimize
`optimize/score.py` prints an estimated **load time in milliseconds**. **LOWER is better.**
That is the only definition of "better." It will not change to flatter the results.

## What the optimizer (Claude) MAY change  — the ASSET
- `index.html` (markup, inline CSS/JS, resource hints, loading attributes, script defer/async).
- The homepage's **static image files** (`*.jpg`, `*.png`) — may be re-compressed / resized,
  but ONLY within the quality floor below.

## What the optimizer must NEVER do
- Never edit `optimize/score.py` or this file. Never change the definition of "better."
- Never delete page content, sections, links, the Book/Calendly CTAs, analytics, or SEO data
  (the score has a structural guard that hard-fails if these go missing).
- **Image quality floor:** JPEG quality must stay ≥ 80, longest edge must stay ≥ 1600px,
  no visible degradation. Originals are backed up in `originals/`.
- Never touch `api/track.js`, `stats.html`, or anything unrelated to homepage load.

## The loop
Run in ~5-minute loops, overnight, indefinitely, until the goal is hit or Luke stops it:
1. Record current baseline asset + score.
2. Form ONE hypothesis, make ONE change to the asset.
3. Score with `score.py` ONLY.
4. Beats baseline → keep it (new baseline). Doesn't → revert, try a different change.
5. Log every round in `optimize/results-log.md` (round #, change, before→after, kept/reverted).
6. Push confirmed net wins so they actually go live (auto-deploys).

## Goal / stop condition
Target: homepage estimated load under **1500 ms** (from a multi-second baseline), without
violating any guard. Stop when hit, when no change has improved the score for many rounds,
or when Luke says stop.
