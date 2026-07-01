// api/admin-ops.js — PRIVATE, auth-gated ops health summary.
//
// Returns 401 unless the request supplies the admin key (?key=…) that matches
// REVIEW_ADMIN_KEY (see lib/admin.js). Read-only: counts + top event labels only —
// never names/emails/phones/review text. Runs no mutation jobs. Prints no secrets.
// Degrades gracefully if KV is unavailable.
import { isAdmin } from '../lib/admin.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) { res.status(401).json({ error: 'unauthorized' }); return; }

  const summary = { generatedAt: new Date().toISOString(), ok: true, containsPII: false };
  try {
    const { kv } = await import('@vercel/kv');
    const [pending, approved, leads, analytics] = await Promise.all([
      kv.get('reviews:pending').catch(() => []),
      kv.get('reviews:approved').catch(() => []),
      kv.lrange('leads:v1', 0, -1).catch(() => []),
      kv.get('analytics').catch(() => []),
    ]);
    const eventCounts = {};
    (analytics || []).forEach((e) => { if (e && e.l) eventCounts[e.l] = (eventCounts[e.l] || 0) + 1; });
    summary.counts = {
      pendingReviews: (pending || []).length,
      approvedReviews: (approved || []).length,
      totalLeads: (leads || []).length,
      trackedEvents: (analytics || []).length,
    };
    summary.topEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([event, count]) => ({ event, count }));
  } catch (e) {
    summary.ok = false;
    summary.note = 'KV unavailable (env missing or error). No data exposed.';
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(summary);
}
