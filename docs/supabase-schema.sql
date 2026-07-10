-- cutcowithluke.com — Supabase schema
-- Run this once in the Supabase SQL editor for the "cutco-with-luke" project.
-- All access is server-only via the SERVICE ROLE key (bypasses RLS). RLS is ON
-- with NO public policies, so the anon key can neither read nor write these tables.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rating     int  not null check (rating between 1 and 5),
  text       text not null,
  status     text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_status_created_idx on reviews (status, created_at desc);

create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact      text not null,
  contact_type text not null default 'email',
  when_text    text default '',
  note         text default '',
  created_at   timestamptz not null default now()
);
create index if not exists leads_created_idx on leads (created_at desc);

create table if not exists analytics_events (
  id         bigint generated always as identity primary key,
  t          text not null,
  l          text default '',
  created_at timestamptz not null default now()
);
create index if not exists analytics_created_idx on analytics_events (created_at desc);

create table if not exists counters (
  name  text primary key,
  value bigint not null default 0
);
insert into counters (name, value) values ('lifetime', 0)
  on conflict (name) do nothing;

create table if not exists rate_limits (
  bucket     bigint primary key,
  n          int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Atomic helper functions (called via the service role only)
-- ---------------------------------------------------------------------------

create or replace function increment_counter(p_name text)
returns bigint language plpgsql as $$
declare v bigint;
begin
  insert into counters (name, value) values (p_name, 1)
    on conflict (name) do update set value = counters.value + 1
    returning value into v;
  return v;
end; $$;

create or replace function bump_rate(p_bucket bigint)
returns int language plpgsql as $$
declare v int;
begin
  insert into rate_limits (bucket, n) values (p_bucket, 1)
    on conflict (bucket) do update set n = rate_limits.n + 1
    returning n into v;
  return v;
end; $$;

-- ---------------------------------------------------------------------------
-- Lock everything down: RLS on, no public policies, service role bypasses RLS.
-- ---------------------------------------------------------------------------

alter table reviews          enable row level security;
alter table leads            enable row level security;
alter table analytics_events enable row level security;
alter table counters         enable row level security;
alter table rate_limits      enable row level security;

-- Functions should not be callable by the public/anon roles.
revoke execute on function increment_counter(text) from public, anon, authenticated;
revoke execute on function bump_rate(bigint)        from public, anon, authenticated;
