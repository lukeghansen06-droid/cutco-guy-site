// lib/store-supabase.js
// Supabase (Postgres) persistence for cutcowithluke.com — replaces Vercel KV.
//
// Real tables (visible in the Supabase dashboard): reviews, leads,
// analytics_events, counters, rate_limits. See docs/supabase-schema.sql.
//
// SERVER-ONLY. Uses the SERVICE ROLE key, which bypasses RLS. Never import this
// into browser/client code and never expose SUPABASE_SERVICE_ROLE_KEY.
//
// This module is imported lazily (dynamic import) from the Vercel API handlers,
// so `bun test` — which unit-tests the pure handlers with an in-memory mock —
// never needs @supabase/supabase-js installed.
import { createClient } from '@supabase/supabase-js';

let _client = null;
export function supa() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

const toMs = (iso) => (iso ? new Date(iso).getTime() : Date.now());
const toIso = (ms) => new Date(Number(ms) || Date.now()).toISOString();

const reviewRowToObj = (r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, ts: toMs(r.created_at) });
const leadRowToObj = (r) => ({ id: r.id, name: r.name, contact: r.contact, contactType: r.contact_type, when: r.when_text, note: r.note, ts: toMs(r.created_at) });

// ---------------------------------------------------------------------------
// KV-compatible adapter.
// The pure, unit-tested handlers (handleReviews, handleLead) call get/set/lpush/
// lrange. We implement exactly those, backed by proper relational tables, so the
// handlers and their tests stay byte-for-byte unchanged.
// ---------------------------------------------------------------------------
export function kvAdapter() {
  const db = supa();
  return {
    async get(key) {
      if (key === 'reviews:approved' || key === 'reviews:pending') {
        const status = key.endsWith('approved') ? 'approved' : 'pending';
        const { data, error } = await db
          .from('reviews').select('*').eq('status', status)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(reviewRowToObj);
      }
      if (key === 'analytics') {
        const { data, error } = await db
          .from('analytics_events').select('t,l,created_at')
          .order('created_at', { ascending: false }).limit(5000);
        if (error) throw error;
        return (data || []).map((e) => ({ t: e.t, l: e.l, ts: toMs(e.created_at) })).reverse();
      }
      if (key === 'lifetime') {
        const { data } = await db.from('counters').select('value').eq('name', 'lifetime').maybeSingle();
        return data ? Number(data.value) : 0;
      }
      return null;
    },

    async set(key, arr) {
      if (key === 'reviews:approved' || key === 'reviews:pending') {
        const status = key.endsWith('approved') ? 'approved' : 'pending';
        // Reviews volume is tiny; replace the whole status set to match `arr`.
        const { error: delErr } = await db.from('reviews').delete().eq('status', status);
        if (delErr) throw delErr;
        if (Array.isArray(arr) && arr.length) {
          const rows = arr.map((r) => ({
            id: r.id, name: r.name, rating: r.rating, text: r.text,
            status, created_at: toIso(r.ts),
          }));
          const { error: insErr } = await db.from('reviews').insert(rows);
          if (insErr) throw insErr;
        }
        return;
      }
      if (key === 'analytics') {
        // Only used for the admin reset([]) path.
        if (Array.isArray(arr) && arr.length === 0) {
          await db.from('analytics_events').delete().gte('id', 0);
        }
        return;
      }
    },

    async lpush(key, val) {
      if (key === 'leads:v1') {
        const row = {
          id: val.id, name: val.name, contact: val.contact,
          contact_type: val.contactType, when_text: val.when || '',
          note: val.note || '', created_at: toIso(val.ts),
        };
        const { error } = await db.from('leads').insert(row);
        if (error) throw error;
        return 1;
      }
      return 0;
    },

    async lrange(key, a, b) {
      if (key === 'leads:v1') {
        const limit = b === -1 ? 1000 : b + 1;
        const { data, error } = await db
          .from('leads').select('*')
          .order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        const rows = (data || []).map(leadRowToObj);
        return rows.slice(a, b === -1 ? undefined : b + 1);
      }
      return [];
    },

    async incr(key) {
      if (key === 'lifetime') {
        const { data, error } = await db.rpc('increment_counter', { p_name: 'lifetime' });
        if (error) throw error;
        return Number(data);
      }
      if (key.startsWith('rl:')) {
        const { data, error } = await db.rpc('bump_rate', { p_bucket: Number(key.slice(3)) });
        if (error) throw error;
        return Number(data);
      }
      return 0;
    },

    async expire() { /* no-op: rate_limits age out by created_at; counters persist */ return 1; },
  };
}

// ---------------------------------------------------------------------------
// Direct analytics helpers used by api/track.js — one row per event (so the
// Supabase table is a real, queryable log rather than a re-written blob).
// ---------------------------------------------------------------------------
export async function logEvent(t, l) {
  await supa().from('analytics_events').insert({ t, l: l || '' });
}
export async function getEvents(limit = 5000) {
  const { data, error } = await supa()
    .from('analytics_events').select('t,l,created_at')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map((e) => ({ t: e.t, l: e.l, ts: toMs(e.created_at) })).reverse();
}
export async function incLifetime() {
  const { data } = await supa().rpc('increment_counter', { p_name: 'lifetime' });
  return Number(data || 0);
}
export async function getLifetime() {
  const { data } = await supa().from('counters').select('value').eq('name', 'lifetime').maybeSingle();
  return data ? Number(data.value) : 0;
}
export async function resetEvents() {
  await supa().from('analytics_events').delete().gte('id', 0);
}
export async function rateBump(bucket) {
  const { data } = await supa().rpc('bump_rate', { p_bucket: bucket });
  return Number(data || 0);
}
