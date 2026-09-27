-- generate-periodic and refresh-lists both accept periodType: 'daily' in code
-- (supabase/functions/crypto-analysis/index.ts), but this constraint never
-- allowed it, so any 'daily' periodic report insert fails in production.
ALTER TABLE public.crypto_periodic_reports
  DROP CONSTRAINT IF EXISTS crypto_periodic_reports_period_type_check;

ALTER TABLE public.crypto_periodic_reports
  ADD CONSTRAINT crypto_periodic_reports_period_type_check
  CHECK (period_type = ANY (ARRAY[
    'daily'::text,
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
