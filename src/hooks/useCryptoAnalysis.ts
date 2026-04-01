import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AnalysisImage {
  name: string;
  base64: string;
  type: string;
  preview: string;
}

interface CryptoAnalysis {
  id: string;
  title: string;
  summary: string;
  period_type: string;
  crypto_symbols: string[];
  ai_model_used: string;
  created_at: string;
  crypto_analysis_images?: { id: string; image_url: string; image_name: string }[];
}

export const useCryptoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const historyQuery = useQuery<{ analyses: CryptoAnalysis[] }>({
    queryKey: ['crypto-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('crypto-analysis', {
        body: {},
        headers: {},
      });
      // Use query param approach
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analysis?action=history`;
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) throw new Error('Failed to fetch history');
      return resp.json();
    },
    staleTime: 60000,
  });

  const submitAnalysis = async (images: AnalysisImage[], cryptoSymbols: string[], title: string) => {
    setIsAnalyzing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analysis?action=analyze`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: images.map(img => ({ name: img.name, base64: img.base64, type: img.type })),
          cryptoSymbols,
          title,
        }),
      });

      if (resp.status === 429) {
        toast({ title: 'Limite atingido', description: 'Tente novamente em alguns minutos.', variant: 'destructive' });
        return null;
      }
      if (resp.status === 402) {
        toast({ title: 'Créditos esgotados', description: 'Adicione créditos para continuar.', variant: 'destructive' });
        return null;
      }
      if (!resp.ok) throw new Error('Erro na análise');

      const data = await resp.json();
      toast({ title: 'Análise concluída!', description: 'Relatório gerado com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['crypto-analyses'] });
      return data.analysis;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    submitAnalysis,
    history: historyQuery.data?.analyses || [],
    isLoadingHistory: historyQuery.isLoading,
  };
};
