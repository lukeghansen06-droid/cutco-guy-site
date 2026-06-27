# cutcowithluke.com — deployment

This repo auto-deploys to the Vercel project **cutco-guy-site** (domain: cutcowithluke.com)
on every push to **main**.

## To update the live site
1. Edit files here (e.g. `index.html`, `stats.html`).
2. Double-click **update-site.bat**  (or run: `git add -A && git commit -m "..." && git push`).
3. Vercel auto-deploys in ~20s and re-aliases cutcowithluke.com.

## Private dashboard
`/stats.html?key=<your key>` — data served by `api/track.js` (Vercel KV). No names stored.

## Notes
- Vercel Web Analytics is enabled (script in index.html + stats.html).
- The old `deploy-cutco.bat` CLI deploy still works as a manual fallback.
