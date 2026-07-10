-- Cutco tools inventory for Supabase project cutco-with-luke.
-- Generated 2026-07-10 05:46 CT. Safe to run in Supabase SQL Editor.
-- Stores only public URLs, local file paths, sources, and notes. No secrets.

create table if not exists tool_inventory (
  id text primary key,
  name text not null,
  tool_group text not null,
  url text not null,
  source text not null,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tool_inventory enable row level security;

-- No public policies: service_role/dashboard only, matching the rest of the site backend.

insert into tool_inventory (id,name,tool_group,url,source,captured_at,updated_at) values
('01-live-site','CutcoWithLuke website','Daily launch','https://cutcowithluke.com/','Desktop shortcut + browser history','2026-07-10 05:46:00-05',now()),
('02-book','Book a demo','Daily launch','https://cutcowithluke.com/book','GitHub repo book.html','2026-07-10 05:46:00-05',now()),
('03-reviews','Reviews & referrals','Daily launch','https://cutcowithluke.com/reviews','GitHub repo reviews.html','2026-07-10 05:46:00-05',now()),
('04-find','Find Your Cutco','Daily launch','https://cutcowithluke.com/find','GitHub repo find.html','2026-07-10 05:46:00-05',now()),
('05-stats','Cutco Data Center','Admin','https://cutcowithluke.com/stats','Desktop shortcut + browser history','2026-07-10 05:46:00-05',now()),
('06-moderate','Moderate reviews','Admin','https://cutcowithluke.com/moderate','GitHub repo moderate.html + Supabase docs','2026-07-10 05:46:00-05',now()),
('07-leads','Leads dashboard','Admin','https://cutcowithluke.com/leads','GitHub repo leads.html + Supabase docs','2026-07-10 05:46:00-05',now()),
('08-supabase','Supabase DB: cutco-with-luke','Data/code','https://supabase.com/dashboard/project/zzgwaldgcagbzpgqvtof','project memory + docs/SUPABASE.md','2026-07-10 05:46:00-05',now()),
('09-github','GitHub repo: cutco-guy-site','Data/code','https://github.com/lukeghansen06-droid/cutco-guy-site','git remote origin','2026-07-10 05:46:00-05',now()),
('10-vercel','Vercel project','Data/code','https://vercel.com/lukehansen01-6567s-projects/cutco-guy-site','browser history + project memory','2026-07-10 05:46:00-05',now()),
('11-command-center','Local Cutco Command Center','CRM/selling','file:///Users/lukehansen/.aside/u/0/agents/main/sessions/2026-07-05_fLaoULI2gtfdvivn/artifacts/cutco_command_center.html','Aside session artifact','2026-07-10 05:46:00-05',now()),
('12-vectorimpact','VectorImpact Prospect Sheet','Vector tools','https://vectorimpact.netlify.app/','Desktop shortcut + browser history','2026-07-10 05:46:00-05',now()),
('13-vectorconnect','VectorConnect','Vector tools','https://www.vectorconnect.com/','project memory + browser history','2026-07-10 05:46:00-05',now()),
('14-cutco-orders','Cutco Orders','Vector tools','https://orders.cutcoapps.com/home','browser history','2026-07-10 05:46:00-05',now())
on conflict (id) do update set name=excluded.name, tool_group=excluded.tool_group, url=excluded.url, source=excluded.source, updated_at=now();
