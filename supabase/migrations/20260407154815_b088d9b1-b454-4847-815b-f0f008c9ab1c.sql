
-- Add access_code column to all analysis tables
ALTER TABLE public.crypto_analyses ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE public.crypto_mentions ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE public.crypto_report_submissions ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE public.crypto_periodic_reports ADD COLUMN IF NOT EXISTS access_code text;

-- Create indexes for access_code filtering
CREATE INDEX IF NOT EXISTS idx_crypto_analyses_access_code ON public.crypto_analyses(access_code);
CREATE INDEX IF NOT EXISTS idx_crypto_mentions_access_code ON public.crypto_mentions(access_code);
CREATE INDEX IF NOT EXISTS idx_crypto_report_submissions_access_code ON public.crypto_report_submissions(access_code);
CREATE INDEX IF NOT EXISTS idx_crypto_periodic_reports_access_code ON public.crypto_periodic_reports(access_code);

-- Drop old auth-based RLS policies on crypto_analyses
DROP POLICY IF EXISTS "Users can read own analyses" ON public.crypto_analyses;
DROP POLICY IF EXISTS "Users can create own analyses" ON public.crypto_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON public.crypto_analyses;

-- Drop old auth-based RLS policies on crypto_analysis_images
DROP POLICY IF EXISTS "Users can read own analysis images" ON public.crypto_analysis_images;
DROP POLICY IF EXISTS "Users can create own analysis images" ON public.crypto_analysis_images;
DROP POLICY IF EXISTS "Users can delete own analysis images" ON public.crypto_analysis_images;

-- Drop old auth-based RLS policies on crypto_mentions
DROP POLICY IF EXISTS "Users can read own mentions" ON public.crypto_mentions;
DROP POLICY IF EXISTS "Users can create own mentions" ON public.crypto_mentions;
DROP POLICY IF EXISTS "Users can delete own mentions" ON public.crypto_mentions;

-- Drop old auth-based RLS policies on crypto_report_submissions
DROP POLICY IF EXISTS "Users can read own submissions" ON public.crypto_report_submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON public.crypto_report_submissions;
DROP POLICY IF EXISTS "Users can delete own submissions" ON public.crypto_report_submissions;

-- Drop old auth-based RLS policies on crypto_periodic_reports
DROP POLICY IF EXISTS "Users can read own periodic reports" ON public.crypto_periodic_reports;
DROP POLICY IF EXISTS "Users can create own periodic reports" ON public.crypto_periodic_reports;
DROP POLICY IF EXISTS "Users can delete own periodic reports" ON public.crypto_periodic_reports;

-- New RLS policies: service_role can do everything (edge functions use service role)
-- Public/anon can only SELECT with access_code filter
CREATE POLICY "Service role full access analyses" ON public.crypto_analyses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read analyses by code" ON public.crypto_analyses FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access images" ON public.crypto_analysis_images FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read images by code" ON public.crypto_analysis_images FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access mentions" ON public.crypto_mentions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read mentions by code" ON public.crypto_mentions FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access submissions" ON public.crypto_report_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read submissions by code" ON public.crypto_report_submissions FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access periodic" ON public.crypto_periodic_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read periodic by code" ON public.crypto_periodic_reports FOR SELECT TO anon USING (true);

-- Allow anon to delete via edge function (service_role handles actual deletes)
-- Allow anon to insert via edge function (service_role handles actual inserts)
