-- access_codes and access_audit_log were created without RLS enabled, which on
-- Supabase means the anon key (public, embedded in the client bundle) can read,
-- insert, update and delete every row directly via PostgREST — bypassing the
-- access-code gate and rate limiting entirely. Only the crypto-analysis edge
-- function should ever touch these tables, and it uses the service role key,
-- which bypasses RLS regardless of policies. So we enable RLS here with no
-- policies at all: default-deny for anon/authenticated, unaffected for the
-- edge function.

alter table public.access_codes enable row level security;
alter table public.access_audit_log enable row level security;
