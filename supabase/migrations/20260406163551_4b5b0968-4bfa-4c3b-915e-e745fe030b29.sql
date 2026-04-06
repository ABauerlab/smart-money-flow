
-- Add user_id to all crypto tables (nullable to preserve existing data)
ALTER TABLE public.crypto_analyses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.crypto_report_submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.crypto_mentions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.crypto_periodic_reports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id
CREATE INDEX IF NOT EXISTS idx_crypto_analyses_user_id ON public.crypto_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_report_submissions_user_id ON public.crypto_report_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_mentions_user_id ON public.crypto_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_periodic_reports_user_id ON public.crypto_periodic_reports(user_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can read analyses" ON public.crypto_analyses;
DROP POLICY IF EXISTS "Anyone can create analyses" ON public.crypto_analyses;
DROP POLICY IF EXISTS "Anyone can read analysis images" ON public.crypto_analysis_images;
DROP POLICY IF EXISTS "Anyone can create analysis images" ON public.crypto_analysis_images;
DROP POLICY IF EXISTS "Anyone can read report submissions" ON public.crypto_report_submissions;
DROP POLICY IF EXISTS "Anyone can create report submissions" ON public.crypto_report_submissions;
DROP POLICY IF EXISTS "Anyone can read crypto mentions" ON public.crypto_mentions;
DROP POLICY IF EXISTS "Anyone can create crypto mentions" ON public.crypto_mentions;
DROP POLICY IF EXISTS "Anyone can read periodic reports" ON public.crypto_periodic_reports;
DROP POLICY IF EXISTS "Anyone can create periodic reports" ON public.crypto_periodic_reports;

-- crypto_analyses policies
CREATE POLICY "Users can read own analyses" ON public.crypto_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analyses" ON public.crypto_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.crypto_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crypto_analysis_images policies (join through analysis ownership)
CREATE POLICY "Users can read own analysis images" ON public.crypto_analysis_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crypto_analyses WHERE id = analysis_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own analysis images" ON public.crypto_analysis_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.crypto_analyses WHERE id = analysis_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own analysis images" ON public.crypto_analysis_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crypto_analyses WHERE id = analysis_id AND user_id = auth.uid()));

-- crypto_report_submissions policies
CREATE POLICY "Users can read own submissions" ON public.crypto_report_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own submissions" ON public.crypto_report_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own submissions" ON public.crypto_report_submissions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crypto_mentions policies
CREATE POLICY "Users can read own mentions" ON public.crypto_mentions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own mentions" ON public.crypto_mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mentions" ON public.crypto_mentions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- crypto_periodic_reports policies
CREATE POLICY "Users can read own periodic reports" ON public.crypto_periodic_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own periodic reports" ON public.crypto_periodic_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own periodic reports" ON public.crypto_periodic_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage policy update for crypto-images bucket (user-scoped)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Authenticated read own crypto images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crypto-images');
CREATE POLICY "Authenticated upload crypto images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crypto-images');
CREATE POLICY "Authenticated delete crypto images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crypto-images');
