-- Findings of the Supabase advisors on the new project (2026-11-10).

-- 1. rls_auto_enable() is a Supabase helper behind an event trigger that turns RLS on for new
--    tables. It is SECURITY DEFINER and was callable by anon/authenticated through
--    /rest/v1/rpc/rls_auto_enable. Event triggers do not need EXECUTE for the API roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- 2. Foreign keys without a covering index (deleting an analysis cascades to these tables).
create index if not exists crypto_report_submissions_analysis_idx
  on public.crypto_report_submissions (analysis_id);
create index if not exists crypto_analysis_images_analysis_idx
  on public.crypto_analysis_images (analysis_id);
