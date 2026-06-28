# Auto Research Engineer — Results Log (homepage load, lower ms = better)

| Round | Change | Score before | Score after | Kept? |
|------:|--------|------------:|-----------:|:-----:|
| 1 | Lazy-load below-fold + gallery images | 37994.5 | 36580.1 | KEPT ✅ |
| 2 | Compress JPEGs (q82, ≤1920px, originals saved) | 36580.1 | 5705.8 | KEPT ✅ |
| 3 | Lazy-load 7 below-fold portrait/gallery imgs | 5705.8 | 2428.5 | KEPT ✅ |
| 4 | Move service-worker script out of <head> | 2428.5 | 2308.5 | KEPT ✅ |

## Summary (Round 1–4)
- **Modeled load: 37,994 ms → 2,308 ms (94% faster)**, guard valid the whole way.
- Biggest win: image weight **21.9 MB → 3.4 MB (85% smaller)**, originals safe in `originals/`.
- Real homepage image payload measured live before opt: **21.74 MB** (→ ~3.4 MB after deploy).
- Next levers (for future rounds): WebP for the 3 critical images, non-blocking Google Font,
  trim inline CSS. Target: under 1,500 ms.

## Status
Changes are saved in the working tree but NOT yet deployed (a stale git index.lock + a
flush-timing gap caused the last push to commit nothing). To ship: run `update-site.bat`
(it deletes the stale lock, commits, pushes → Vercel auto-deploys in ~20s).
| 5 | WebP for hero + gallery display images | 2308.5 | 1887.2 | KEPT ✅ |
| 6 | Non-blocking Google Font (preload swap) | 1887.2 | 1767.6 | KEPT ✅ |
| 7 | Lazy-load below-fold brand-banner showcase | 1767.6 | 1332.6 | KEPT ✅ |

## 🎯 GOAL REACHED — 1,332.6 ms (target was < 1,500)
Full run: **37,994 ms → 1,332 ms (96.5% faster)**, guard valid every round.
- Image payload 21.9 MB → ~2 MB (compression + WebP).
- Critical path: 13 requests → 2 (hero + favicon); everything else lazy.
- Render-blocking resources: 2 → 0 (SW script moved, font made async).
