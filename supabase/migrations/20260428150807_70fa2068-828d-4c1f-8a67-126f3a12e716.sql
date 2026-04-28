ALTER TABLE public.crypto_periodic_reports
  DROP CONSTRAINT IF EXISTS crypto_periodic_reports_period_type_check;

ALTER TABLE public.crypto_periodic_reports
  ADD CONSTRAINT crypto_periodic_reports_period_type_check
  CHECK (period_type = ANY (ARRAY[
    'three_days'::text,
    'weekly'::text,
    'biweekly'::text,
    'triweekly'::text,
    'monthly'::text,
    'bimonthly'::text,
    'quarterly'::text,
    'semiannual'::text,
    'annual'::text
  ]));