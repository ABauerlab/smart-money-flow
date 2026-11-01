-- Consolidated, idempotent schema for a fresh Supabase project (own account, outside
-- Lovable Cloud). The historic migrations in this folder are incomplete: access_code
-- columns and the rl_check rate limiter were created out-of-band in Lovable Cloud and
-- never committed. Everything the edge functions use is declared here.
-- Safe to run on an existing database too (all statements are IF NOT EXISTS / OR REPLACE).
--
-- Security model: every table has RLS enabled and NO policy for anon/authenticated.
-- All access goes through the edge functions with the service role (bypasses RLS).
-- The only exception is market_data_cache, which is read-only public data.

create extension if not exists pgcrypto;

-- ---------- market data cache ----------
create table if not exists public.market_data_cache (
  id text primary key,
  name text not null,
  ticker text not null,
  flag text not null,
  current_volume numeric not null,
  average_volume numeric not null,
  price numeric not null,
  price_change numeric not null,
  volume_ratio numeric not null,
  z_score numeric not null,
  flow_type text not null,
  conviction_score numeric not null,
  currency text not null,
  historical_volumes jsonb default '[]',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.market_data_cache enable row level security;
drop policy if exists "Anyone can read market data cache" on public.market_data_cache;
create policy "Anyone can read market data cache" on public.market_data_cache for select using (true);
create index if not exists idx_market_data_cache_fetched_at on public.market_data_cache (fetched_at);

create or replace function public.update_market_cache_timestamp()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists update_market_cache_updated_at on public.market_data_cache;
create trigger update_market_cache_updated_at before update on public.market_data_cache
  for each row execute function public.update_market_cache_timestamp();

-- ---------- crypto reports ----------
create table if not exists public.crypto_analyses (
  id uuid not null default gen_random_uuid() primary key,
  title text not null,
  summary text,
  period_type text not null default 'daily',
  crypto_symbols text[] default '{}',
  ai_model_used text,
  region text,
  access_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.crypto_analysis_images (
  id uuid not null default gen_random_uuid() primary key,
  analysis_id uuid not null references public.crypto_analyses(id) on delete cascade,
  image_url text not null,
  image_name text,
  ai_interpretation text,
  created_at timestamptz not null default now()
);

create table if not exists public.crypto_report_submissions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.crypto_analyses(id) on delete cascade,
  report_type text not null check (report_type in ('alta', 'baixa', 'volume')),
  report_date date not null default current_date,
  session_time text not null default 'morning' check (session_time in ('morning', 'night')),
  region text not null default 'west' check (region in ('asia', 'west')),
  access_code text,
  source_file_id text,
  source_file_name text,
  source_modified_time timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists crypto_report_submissions_source_file_id_key
  on public.crypto_report_submissions (source_file_id) where source_file_id is not null;
create index if not exists crypto_report_submissions_code_created_idx
  on public.crypto_report_submissions (access_code, created_at desc);
create index if not exists crypto_report_submissions_code_source_idx
  on public.crypto_report_submissions (access_code, source_modified_time desc);

create table if not exists public.crypto_mentions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.crypto_report_submissions(id) on delete cascade,
  symbol text not null,
  report_type text not null,
  report_date date not null,
  week_number int not null,
  year int not null,
  region text not null default 'west' check (region in ('asia', 'west')),
  repetition integer not null default 1,
  rank integer,
  report_time text,
  access_code text,
  created_at timestamptz not null default now()
);
create index if not exists idx_crypto_mentions_symbol on public.crypto_mentions (symbol);
create index if not exists idx_crypto_mentions_week on public.crypto_mentions (year, week_number);
create index if not exists idx_crypto_mentions_date on public.crypto_mentions (report_date);
create index if not exists idx_crypto_mentions_region_date on public.crypto_mentions (access_code, region, report_date);
create index if not exists crypto_mentions_access_report_idx on public.crypto_mentions (access_code, report_date, submission_id);
create index if not exists crypto_mentions_submission_idx on public.crypto_mentions (submission_id);

create table if not exists public.crypto_periodic_reports (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type = any (array[
    'daily','three_days','weekly','biweekly','triweekly','monthly','bimonthly','quarterly','semiannual','annual'
  ])),
  period_start date not null,
  period_end date not null,
  year int not null,
  week_number int,
  rankings jsonb not null default '[]'::jsonb,
  summary text,
  ai_analysis text,
  region text not null default 'west' check (region in ('asia', 'west')),
  access_code text,
  created_at timestamptz not null default now()
);
create index if not exists idx_crypto_periodic_reports_region_period
  on public.crypto_periodic_reports (access_code, region, period_type, period_start);
create index if not exists crypto_periodic_reports_created_idx
  on public.crypto_periodic_reports (access_code, created_at desc);

-- ---------- access control ----------
create table if not exists public.access_codes (
  code text primary key,
  client_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create table if not exists public.access_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip text,
  access_code_attempted text,
  action text,
  success boolean not null
);
create index if not exists access_audit_log_created_idx on public.access_audit_log (created_at desc);
create index if not exists access_audit_log_ip_idx on public.access_audit_log (ip, created_at desc);

-- ---------- rate limiter used by the edge function (rl_check) ----------
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create or replace function public.rl_check(p_key text, p_window_seconds integer, p_max integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
        count = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end
  returning r.count, r.window_start into v_count, v_start;

  allowed := v_count <= p_max;
  retry_after := case when allowed then 0
                 else greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::integer) end;
  -- opportunistic cleanup of long-dead buckets
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return next;
end;
$$;

-- ---------- window aggregate (see 20261015120000_crypto_window_sums.sql) ----------
create or replace function public.crypto_window_sums(p_access_code text, p_start date, p_end date)
returns table (symbol text, total bigint, last_stamp text)
language sql stable set search_path = public as $$
  select s.symbol, s.total, s.last_stamp
  from (
    select upper(btrim(m.symbol)) as symbol,
      sum(case when coalesce(m.repetition, 0) > 0 then m.repetition else 1 end)::bigint as total,
      max(btrim(m.report_date::text || ' ' || coalesce(m.report_time, ''))) as last_stamp
    from public.crypto_mentions m
    where m.access_code = p_access_code
      and m.report_date >= p_start and m.report_date <= p_end
      and btrim(coalesce(m.symbol, '')) <> ''
    group by upper(btrim(m.symbol))
  ) s
  order by s.total desc, s.last_stamp collate "C" desc;
$$;

-- ---------- lock everything down ----------
alter table public.crypto_analyses enable row level security;
alter table public.crypto_analysis_images enable row level security;
alter table public.crypto_report_submissions enable row level security;
alter table public.crypto_mentions enable row level security;
alter table public.crypto_periodic_reports enable row level security;
alter table public.access_codes enable row level security;
alter table public.access_audit_log enable row level security;
alter table public.rate_limits enable row level security;

revoke all on function public.crypto_window_sums(text, date, date) from public, anon, authenticated;
grant execute on function public.crypto_window_sums(text, date, date) to service_role;
revoke all on function public.rl_check(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rl_check(text, integer, integer) to service_role;
