# cutcowithluke.com — Supabase backend

The site's data (reviews, leads, private analytics) lives in **Supabase Postgres**,
project **`cutco-with-luke`** (owner: lukehansen01@gmail.com). Open it at
<https://supabase.com/dashboard> → project **cutco-with-luke**.

## Tables (Table Editor)

| Table | What it holds |
|-------|---------------|
| `reviews` | Submitted reviews. `status = 'pending'` until approved on `/moderate`, then `'approved'` (only approved ones show on `/reviews`). |
| `leads` | Demo/referral requests captured by the site forms. |
| `analytics_events` | Privacy-first visitor events (no names/emails) shown on `/stats`. |
| `counters` | `lifetime` = all-time analytics event count. |
| `rate_limits` | Per-minute buckets used to throttle event spam. |

Schema + helper functions: `docs/supabase-schema.sql` (run once in the SQL editor).

## Security model

- All API access is **server-side** using the **service role key** (bypasses RLS).
- RLS is **enabled with no public policies**, so the anon/public key cannot read
  or write these tables. The anon key is never embedded in the site.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Notes |
|------|-------|-------|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | **Secret.** Server only. |
| `REVIEW_ADMIN_KEY` | admin key | Gates `/stats`, `/moderate`, `/leads` (unchanged) |
| `LEADS_KEY` | leads-view key | Gates `/api/leads` (unchanged) |
| `RESEND_API_KEY` | optional | New-lead email notifications (optional) |

The old `KV_*` variables are no longer used and can be removed.
