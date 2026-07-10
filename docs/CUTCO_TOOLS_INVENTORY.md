# Luke-owned sites overview

Generated: 2026-07-10 after Luke asked for a brighter, higher-contrast overview containing only his sites.

## Included

- https://cutcowithluke.com/
- cutcowithluke.com live sitemap pages: /, /book, /find, /meet, /reviews, /faq, /gift, /owners, /referred, /card, /north-shore-cutco, /winnetka-cutco, /glencoe-cutco, /northbrook-cutco, /evanston-cutco, /depauw-cutco, /work, /privacy
- cutcowithluke.com private/admin pages: /stats, /moderate, /leads
- Vercel preview variations found in history: cutco-guy-site-git-migrate-supabase, cutco-guy-site-monv7oh74, cutco-guy-site-8ceu1y15l, cutco-guy-site-8iwrs5733, cutco-guy-site-nqjdyybj7
- https://luke-maxxing-os.vercel.app/
- https://regal-gnome-d05713.netlify.app/
- Local owned site files: Cutco Command Center, Cutco Sales Manager, CutcoWithLuke refer upgrade, Downloads Command Center copy

## Excluded because they are not Luke-owned sites

- VectorImpact
- VectorConnect
- Cutco Orders
- demos.cutcoapps.com
- cutco.com
- GitHub, Supabase, and Vercel dashboards

## Sources checked

- Memory: Cutco Command Center and cutcowithluke.com records
- Chrome history: cutcowithluke.com, Vercel previews, Luke Maxxing OS, Supabase/GitHub evidence
- Live sitemap: https://cutcowithluke.com/sitemap.xml
- Local repo: /Users/lukehansen/cutco-guy-site
- Local repo: /Users/lukehansen/luke-maxxing-os
- Aside artifacts: /Users/lukehansen/.aside/u/0/agents/main/sessions/2026-07-05_fLaoULI2gtfdvivn/artifacts
- Desktop: previous Cutco Tools hub and shortcut folder

## v2 redesign (2026-07-10, same day follow-up)

Luke said the first version looked bland. Rebuilt with:
- Animated aurora/glassmorphism dark theme matching the established Cutco Command Center look, instead of the flat bright-block style.
- Live "Check all links" button that actually pings every http(s) link from the browser and shows Online/Unreachable, auto-runs on load.
- Search box and grouped tabs (Primary/Pages/Private/Previews/Local) so 33 links do not read as one long wall.
- Copy-link buttons.

Bugs found and fixed during verification:
1. Status badges reset to "Not checked yet" whenever the search/tab filter re-rendered cards, even after a successful check. Fixed by persisting results in a `statusState` map instead of baking status into freshly rendered markup.
2. `navigator.clipboard.writeText` could hang indefinitely with no fallback in some contexts. Replaced with a synchronous `execCommand('copy')` primary path plus a hard 1.2s timeout fallback, so copy can never hang and always gives the user a clear success/fail toast.
3. The decorative gradient-border glow (`.card:before`) had no `pointer-events:none`, so it silently sat above the Open/Copy buttons in paint order and could swallow real clicks. Fixed by adding `pointer-events:none` to that pseudo-element. Verified with real coordinate-based clicks before and after.

All 29 web links and 4 local file links were verified individually after the fix.
