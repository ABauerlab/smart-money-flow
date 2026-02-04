-- Create table for caching market data (avoids API rate limits)
CREATE TABLE public.market_data_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  flag TEXT NOT NULL,
  current_volume NUMERIC NOT NULL,
  average_volume NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  price_change NUMERIC NOT NULL,
  volume_ratio NUMERIC NOT NULL,
  z_score NUMERIC NOT NULL,
  flow_type TEXT NOT NULL,
  conviction_score NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  historical_volumes JSONB DEFAULT '[]',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read (market data is not sensitive)
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cached market data
CREATE POLICY "Anyone can read market data cache"
ON public.market_data_cache
FOR SELECT
USING (true);

-- Policy: Only edge functions (service role) can insert/update
CREATE POLICY "Service role can manage cache"
ON public.market_data_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_market_data_cache_fetched_at ON public.market_data_cache(fetched_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_market_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_market_cache_updated_at
BEFORE UPDATE ON public.market_data_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_market_cache_timestamp();