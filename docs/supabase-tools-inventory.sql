-- Site-only inventory for Luke-owned sites. No official third-party tools.
-- Safe to run in Supabase SQL Editor. No secrets.

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

delete from tool_inventory;

insert into tool_inventory (id,name,tool_group,url,source,captured_at,updated_at) values
('01-cutcowithluke','cutcowithluke.com','Primary owned site','https://cutcowithluke.com/','Live site, sitemap, repo, browser history','2026-07-10 06:20:00-05',now()),
('02-cutco-stats','cutcowithluke.com/stats','Private page','https://cutcowithluke.com/stats','Browser history and repo','2026-07-10 06:20:00-05',now()),
('03-cutco-moderate','cutcowithluke.com/moderate','Private page','https://cutcowithluke.com/moderate','Repo and prior Supabase workflow','2026-07-10 06:20:00-05',now()),
('04-cutco-leads','cutcowithluke.com/leads','Private page','https://cutcowithluke.com/leads','Repo and prior Supabase workflow','2026-07-10 06:20:00-05',now()),
('05-migrate-preview','cutco-guy-site migrate-supabase preview','Preview variation','https://cutco-guy-site-git-migrate-supabase-lukehansen01-6567s-projects.vercel.app/','Browser history','2026-07-10 06:20:00-05',now()),
('06-monv7-preview','cutco-guy-site monv7oh74 preview','Preview variation','https://cutco-guy-site-monv7oh74-lukehansen01-6567s-projects.vercel.app/','Browser history','2026-07-10 06:20:00-05',now()),
('07-8ceu-preview','cutco-guy-site 8ceu1y15l preview','Preview variation','https://cutco-guy-site-8ceu1y15l-lukehansen01-6567s-projects.vercel.app/','Browser history','2026-07-10 06:20:00-05',now()),
('08-luke-maxxing-os','Luke Maxxing OS','Primary owned site','https://luke-maxxing-os.vercel.app/','Browser history and local repo','2026-07-10 06:20:00-05',now()),
('09-luke-maxxing-cutco','Luke Maxxing OS Cutco route','Owned route','https://luke-maxxing-os.vercel.app/cutco','Local repo route and browser history for parent app','2026-07-10 06:20:00-05',now()),
('10-regal-gnome','regal-gnome-d05713 Netlify','Owned older site','https://regal-gnome-d05713.netlify.app/','Live web check and memory','2026-07-10 06:20:00-05',now()),
('11-command-center','Local Cutco Command Center','Local owned site file','file:///Users/lukehansen/.aside/u/0/agents/main/sessions/2026-07-05_fLaoULI2gtfdvivn/artifacts/cutco_command_center.html','Aside artifact','2026-07-10 06:20:00-05',now()),
('12-sales-manager','Local Cutco Sales Manager','Local owned site file','file:///Users/lukehansen/.aside/u/0/agents/main/sessions/2026-07-05_fLaoULI2gtfdvivn/artifacts/cutco_sales_manager.html','Aside artifact','2026-07-10 06:20:00-05',now())
on conflict (id) do update set name=excluded.name, tool_group=excluded.tool_group, url=excluded.url, source=excluded.source, updated_at=now();
