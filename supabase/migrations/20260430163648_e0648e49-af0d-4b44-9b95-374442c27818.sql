-- Lock down anonymous access to crypto data tables and storage uploads
-- All client reads/writes go through the crypto-analysis edge function (service role),
-- which now enforces accessCode validation server-side.

-- 1. Drop public/anon SELECT policies on crypto_* tables
DROP POLICY IF EXISTS "Anon read analyses by code" ON public.crypto_analyses;
DROP POLICY IF EXISTS "Anon read images by code" ON public.crypto_analysis_images;
DROP POLICY IF EXISTS "Anon read mentions by code" ON public.crypto_mentions;
DROP POLICY IF EXISTS "Anon read submissions by code" ON public.crypto_report_submissions;
DROP POLICY IF EXISTS "Anon read periodic by code" ON public.crypto_periodic_reports;

-- Service-role policies remain in place; the edge function uses the service role key.

-- 2. Restrict storage uploads on crypto-images bucket to authenticated users only.
-- The edge function uploads via the service role (which bypasses RLS), so this is safe.
DROP POLICY IF EXISTS "Anyone can upload crypto images" ON storage.objects;
-- Keep "Authenticated upload crypto images" policy as a backup for any future authed flow.

-- 3. Restrict bucket listing: keep public read of individual files (URLs use random UUIDs)
-- but prevent enumeration via list. The existing SELECT public policy allows GET on a
-- known path; Supabase storage list endpoint also requires this policy. Without auth
-- there's no good way to support both, so we narrow SELECT to authenticated and keep
-- the bucket public for direct URL access (Supabase serves public buckets via CDN
-- regardless of RLS for known object paths).
DROP POLICY IF EXISTS "Anyone can read crypto images" ON storage.objects;
-- Public bucket CDN access (https://.../object/public/...) continues to work for known
-- UUID-prefixed file names. Listing the bucket now requires authentication.