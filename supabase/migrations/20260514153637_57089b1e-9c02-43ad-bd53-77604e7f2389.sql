
ALTER TABLE public.crypto_mentions ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'west';
ALTER TABLE public.crypto_report_submissions ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'west';
ALTER TABLE public.crypto_analyses ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.crypto_periodic_reports ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'west';

ALTER TABLE public.crypto_mentions DROP CONSTRAINT IF EXISTS crypto_mentions_region_check;
ALTER TABLE public.crypto_mentions ADD CONSTRAINT crypto_mentions_region_check CHECK (region IN ('asia','west'));

ALTER TABLE public.crypto_report_submissions DROP CONSTRAINT IF EXISTS crypto_report_submissions_region_check;
ALTER TABLE public.crypto_report_submissions ADD CONSTRAINT crypto_report_submissions_region_check CHECK (region IN ('asia','west'));

ALTER TABLE public.crypto_periodic_reports DROP CONSTRAINT IF EXISTS crypto_periodic_reports_region_check;
ALTER TABLE public.crypto_periodic_reports ADD CONSTRAINT crypto_periodic_reports_region_check CHECK (region IN ('asia','west'));

CREATE INDEX IF NOT EXISTS idx_crypto_mentions_region_date
  ON public.crypto_mentions (access_code, region, report_date);

CREATE INDEX IF NOT EXISTS idx_crypto_periodic_reports_region_period
  ON public.crypto_periodic_reports (access_code, region, period_type, period_start);
