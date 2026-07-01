#!/usr/bin/env node
/*
 * scripts/admin-digest.mjs — LOCAL, PRIVATE, ENV-GATED. REPORT ONLY.
 *
 * Produces a private ops digest of COUNTS ONLY (never names/emails/phones/review
 * text). Runs only if KV credentials are present in the environment; otherwise it
 * skips gracefully. The output report is gitignored — do not commit it.
 *
 * Reads the same KV keys the site uses:
 *   reviews:pending / reviews:approved (arrays) · leads:v1 (list) · analytics (array)
 */
import { writeReport, reportHeader, li } from './lib/audit-common.mjs';

const hasKv = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function run() {
  if (!hasKv) {
    const json = { generatedAt: new Date().toISOString(), reportOnly: true, skipped: true, reason: 'No KV credentials in environment (KV_REST_API_URL / KV_REST_API_TOKEN). Nothing queried.' };
    const md = `${reportHeader('Admin Digest — Skipped', 'Counts only; never contains customer PII. Report is gitignored.')}
**Skipped:** KV credentials are not present in this environment, so nothing was queried.
Run locally with the KV env vars set to generate the digest. Nothing was exposed.`;
    console.log(`Admin digest → SKIPPED (no KV env). Wrote note → ${writeReport('admin-digest', json, md)}`);
    return;
  }

  let kv;
  try { ({ kv } = await import('@vercel/kv')); }
  catch (e) { console.log('Admin digest → @vercel/kv not installed; run `npm install`. Skipped.'); return; }

  const safe = async (fn, dflt) => { try { return await fn(); } catch { return dflt; } };
  const pending = await safe(() => kv.get('reviews:pending'), []) || [];
  const approved = await safe(() => kv.get('reviews:approved'), []) || [];
  const leads = await safe(() => kv.lrange('leads:v1', 0, -1), []) || [];
  const analytics = await safe(() => kv.get('analytics'), []) || [];

  // COUNTS + event-label aggregates only — no record contents.
  const referrals = leads.filter((l) => l && /refer/i.test(JSON.stringify(l.source || l.type || ''))).length;
  const eventCounts = {};
  for (const e of analytics) { const l = e && e.l; if (l) eventCounts[l] = (eventCounts[l] || 0) + 1; }
  const topCtas = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const json = {
    generatedAt: new Date().toISOString(), reportOnly: true, containsPII: false,
    counts: { pendingReviews: pending.length, approvedReviews: approved.length, totalLeads: leads.length, referralLeads: referrals, trackedEvents: analytics.length },
    topEvents: topCtas.map(([l, n]) => ({ event: l, count: n })),
  };
  const md = `${reportHeader('Admin Digest — Private (counts only)', 'Counts only; never contains customer names/emails/phones. Report is gitignored — do not commit.')}
## Counts
- Pending reviews: **${pending.length}**
- Approved reviews: **${approved.length}**
- Total leads: **${leads.length}** (referral-tagged: ${referrals})
- Tracked events: **${analytics.length}**

## Top events (by label)
${li(topCtas.map(([l, n]) => `${l} — ${n}`))}
`;
  console.log(`Admin digest → ${writeReport('admin-digest', json, md)} (counts only; PII never written)`);
}

run().catch((e) => { console.log('Admin digest → error (skipped safely):', e.message); });
