
-- Table for individual report submissions (3 per session: alta, baixa, volume)
CREATE TABLE public.crypto_report_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES public.crypto_analyses(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('alta', 'baixa', 'volume')),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  session_time text NOT NULL DEFAULT 'morning' CHECK (session_time IN ('morning', 'night')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_report_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read report submissions" ON public.crypto_report_submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can create report submissions" ON public.crypto_report_submissions FOR INSERT WITH CHECK (true);

-- Table tracking crypto mentions extracted from each report
CREATE TABLE public.crypto_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.crypto_report_submissions(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  report_type text NOT NULL,
  report_date date NOT NULL,
  week_number int NOT NULL,
  year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crypto mentions" ON public.crypto_mentions FOR SELECT USING (true);
CREATE POLICY "Anyone can create crypto mentions" ON public.crypto_mentions FOR INSERT WITH CHECK (true);

CREATE INDEX idx_crypto_mentions_symbol ON public.crypto_mentions(symbol);
CREATE INDEX idx_crypto_mentions_week ON public.crypto_mentions(year, week_number);
CREATE INDEX idx_crypto_mentions_date ON public.crypto_mentions(report_date);

-- Table for periodic reports (weekly, biweekly, triweekly, monthly, bimonthly, quarterly, semiannual)
CREATE TABLE public.crypto_periodic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'biweekly', 'triweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  year int NOT NULL,
  week_number int,
  rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  ai_analysis text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_periodic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read periodic reports" ON public.crypto_periodic_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can create periodic reports" ON public.crypto_periodic_reports FOR INSERT WITH CHECK (true);
