ALTER TABLE public.crypto_mentions
  ADD COLUMN IF NOT EXISTS repetition integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS report_time text;