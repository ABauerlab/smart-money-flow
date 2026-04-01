
-- Create crypto_analyses table
CREATE TABLE public.crypto_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  period_type TEXT NOT NULL DEFAULT 'daily',
  crypto_symbols TEXT[] DEFAULT '{}',
  ai_model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analyses" ON public.crypto_analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can create analyses" ON public.crypto_analyses FOR INSERT WITH CHECK (true);

-- Create crypto_analysis_images table
CREATE TABLE public.crypto_analysis_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.crypto_analyses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  ai_interpretation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_analysis_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis images" ON public.crypto_analysis_images FOR SELECT USING (true);
CREATE POLICY "Anyone can create analysis images" ON public.crypto_analysis_images FOR INSERT WITH CHECK (true);

-- Create storage bucket for crypto images
INSERT INTO storage.buckets (id, name, public) VALUES ('crypto-images', 'crypto-images', true);

CREATE POLICY "Anyone can read crypto images" ON storage.objects FOR SELECT USING (bucket_id = 'crypto-images');
CREATE POLICY "Anyone can upload crypto images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'crypto-images');
