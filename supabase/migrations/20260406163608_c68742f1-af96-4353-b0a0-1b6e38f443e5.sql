
DROP POLICY IF EXISTS "Service role can manage cache" ON public.market_data_cache;

CREATE POLICY "Service role can manage cache" ON public.market_data_cache
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
