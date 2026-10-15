-- Sums the REPETIÇÃO column per symbol for one access code and date window, inside
-- the database. Replaces reading every crypto_mentions row of a window into the edge
-- function: a week holds thousands of rows, and PostgREST silently truncates any
-- plain query at 1000 rows (max_rows), which froze the weekly/monthly totals.
--
-- Mirrors sumMentions() in supabase/functions/crypto-analysis/index.ts exactly:
--   * symbol upper-cased, empty symbols skipped
--   * repetition <= 0 or null counts as 1
--   * last_stamp = latest "report_date report_time" (used to break ties)
-- The edge function falls back to paginated reads if this function is missing.
create or replace function public.crypto_window_sums(
  p_access_code text,
  p_start date,
  p_end date
)
returns table (symbol text, total bigint, last_stamp text)
language sql
stable
set search_path = public
as $$
  select s.symbol, s.total, s.last_stamp
  from (
    select
      upper(m.symbol) as symbol,
      sum(case when coalesce(m.repetition, 0) > 0 then m.repetition else 1 end)::bigint as total,
      max(btrim(m.report_date::text || ' ' || coalesce(m.report_time, ''))) as last_stamp
    from public.crypto_mentions m
    where m.access_code = p_access_code
      and m.report_date >= p_start
      and m.report_date <= p_end
      and btrim(coalesce(m.symbol, '')) <> ''
    group by upper(m.symbol)
  ) s
  -- Subquery so the output aliases can be used inside an ORDER BY expression
  -- (ORDER BY ... COLLATE on a bare alias is rejected by Postgres).
  order by s.total desc, s.last_stamp collate "C" desc;
$$;

-- Only the edge function (service role) may call it.
revoke all on function public.crypto_window_sums(text, date, date) from public, anon, authenticated;
grant execute on function public.crypto_window_sums(text, date, date) to service_role;
