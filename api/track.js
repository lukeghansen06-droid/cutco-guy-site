import { isAdmin as isAdminReq } from '../lib/admin.js';
// Supabase store (analytics_events / counters / rate_limits) is imported lazily
// inside the handler so the pure no-track tests never load @supabase/supabase-js.

// Private visitor analytics for Luke. No personal data is stored — only
// event types, the label tapped/typed, and a timestamp. Admin GET (with the
// secret key) returns aggregated stats for the private dashboard.
const KEY = 'analytics';
const MAX = 4000; // keep the most recent N events

const TYPES = ['add', 'view', 'ask', 'cat', 'search', 'quiz', 'book', 'send', 'page', 'ev'];

function clean(s, max) {
  return String(s == null ? '' : s).slice(0, max).replace(/[<>]/g, '').trim();
}

export default async function handler(req, res) {
  const ORIGIN = String(req.headers.origin || '');
  const allowed = /^https:\/\/cutcowithluke\.com$/.test(ORIGIN)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(ORIGIN)
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN);
  res.setHeader('Access-Control-Allow-Origin', allowed ? ORIGIN : 'https://cutcowithluke.com');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isAdmin = isAdminReq(req);

  try {
    const { logEvent, getEvents, incLifetime, getLifetime, resetEvents, rateBump } =
      await import('../lib/store-supabase.js');
    // ---- POST: log an event (public) or admin reset ----
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      body = body || {};
      // Admin: clear all analytics (start fresh)
      if (isAdmin && body.action === 'reset') {
        await resetEvents();
        return res.status(200).json({ ok: true, reset: true });
      }
      const t = clean(body.t, 12);
      if (TYPES.indexOf(t) < 0) return res.status(200).json({ ok: true }); // ignore unknown
      const l = clean(body.l, 120);

      // Only accept events that actually originate from this site (blocks off-site spam).
      const ref = String(req.headers['referer'] || req.headers['referrer'] || '');
      const fromSite = allowed || /cutcowithluke\.com/i.test(ref) || /\.vercel\.app/i.test(ref);
      // Owner No-Track: never log events from admin/stats/local/keyed contexts.
      const skip = isAdmin
        || !fromSite
        || /[?&](key|token|admin)=/i.test(ref)
        || /\/(stats|leads|moderate|admin|ops)(\.html)?(\/|\?|#|$)/i.test(ref)
        || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/i.test(ref);
      if (skip) return res.status(200).json({ ok: true, skipped: true });

      // Lightweight rate limit: bound events per minute to prevent flooding the store.
      try {
        const n = await rateBump(Math.floor(Date.now() / 60000));
        if (n > 600) return res.status(200).json({ ok: true, skipped: 'rate' });
      } catch (e) { /* if rate-limit unavailable, fail open */ }

      await logEvent(t, l);
      try { await incLifetime(); } catch (e) {}
      return res.status(200).json({ ok: true });
    }

    // ---- GET: aggregated stats (ADMIN ONLY — this is private to Luke) ----
    if (req.method === 'GET') {
      if (!isAdmin) return res.status(403).json({ error: 'Private. A valid key is required.' });
      const all = await getEvents();
      const now = Date.now();
      const DAY = 86400000;

      const byType = {};
      const products = {};   // name -> {add, view}
      const cats = {};
      const searches = {};
      const questions = [];   // {q, ts}
      const recent = [];
      let last7 = 0, last24 = 0;
      const dayBuckets = {};  // yyyy-mm-dd -> count

      all.forEach((e) => {
        byType[e.t] = (byType[e.t] || 0) + 1;
        if (now - e.ts < 7 * DAY) last7++;
        if (now - e.ts < DAY) last24++;
        const d = new Date(e.ts).toISOString().slice(0, 10);
        dayBuckets[d] = (dayBuckets[d] || 0) + 1;

        if ((e.t === 'add' || e.t === 'view') && e.l) {
          products[e.l] = products[e.l] || { add: 0, view: 0 };
          products[e.l][e.t]++;
        }
        if (e.t === 'cat' && e.l) cats[e.l] = (cats[e.l] || 0) + 1;
        if (e.t === 'search' && e.l) searches[e.l] = (searches[e.l] || 0) + 1;
        if (e.t === 'ask' && e.l) questions.push({ q: e.l, ts: e.ts });
      });

      const topProducts = Object.keys(products)
        .map((n) => ({ name: n, add: products[n].add, view: products[n].view, score: products[n].add * 3 + products[n].view }))
        .sort((a, b) => b.score - a.score).slice(0, 25);
      const topCats = Object.keys(cats).map((c) => ({ name: c, n: cats[c] })).sort((a, b) => b.n - a.n);
      const topSearches = Object.keys(searches).map((s) => ({ q: s, n: searches[s] })).sort((a, b) => b.n - a.n).slice(0, 20);
      const recentQuestions = questions.slice(-60).reverse();
      const recentEvents = all.slice(-80).reverse();

      // last 14 days timeline
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * DAY).toISOString().slice(0, 10);
        days.push({ d, n: dayBuckets[d] || 0 });
      }

      const lifetimeTotal = Math.max(all.length, Number(await getLifetime()) || 0);
      return res.status(200).json({
        total: all.length, lifetimeTotal, last24, last7,
        byType, topProducts, topCats, topSearches,
        recentQuestions, recentEvents, days,
        generatedAt: new Date().toISOString(),
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Storage not ready', detail: String((err && err.message) || err) });
  }
}
