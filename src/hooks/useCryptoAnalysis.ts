import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export type Region = 'asia' | 'west';
export type PeriodType = 'daily' | 'weekly' | 'monthly';

interface AnalysisImage { name: string; base64: string; type: string; preview: string; }

interface CryptoAnalysis {
  id: string;
  title: string;
  summary: string;
  period_type: string;
  crypto_symbols: string[];
  ai_model_used: string;
  region?: string | null;
  created_at: string;
  crypto_analysis_images?: { id: string; image_url: string; image_name: string }[];
}

interface SeparateRanking { symbol: string; count: number; }

interface PeriodicReport {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  year: number;
  week_number: number;
  region?: string;
  rankings: { symbol: string; total: number; alta: number; baixa: number; volume: number }[];
  summary: string;
  ai_analysis: string;
  created_at: string;
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analysis`;
const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  'Content-Type': 'application/json',
};

interface UseCryptoAnalysisOpts {
  region: Region;
  periodType?: PeriodType;
  windowIndex?: number;
}

export const useCryptoAnalysis = ({ region, periodType = 'weekly', windowIndex = 0 }: UseCryptoAnalysisOpts) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingLists, setIsRefreshingLists] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getAccessCode = () => localStorage.getItem('crypto_access_code') || undefined;

  const historyQuery = useQuery<{ analyses: CryptoAnalysis[] }>({
    queryKey: ['crypto-analyses', region],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=history`, {
        method: 'POST', headers, body: JSON.stringify({ accessCode: getAccessCode(), region }),
      });
      if (!resp.ok) throw new Error('Failed to fetch history');
      return resp.json();
    },
    staleTime: 60000,
  });

  const periodicReportsQuery = useQuery<{ reports: PeriodicReport[] }>({
    queryKey: ['periodic-reports', region],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=periodic-reports`, {
        method: 'POST', headers, body: JSON.stringify({ accessCode: getAccessCode(), region }),
      });
      if (!resp.ok) throw new Error('Failed to fetch periodic reports');
      return resp.json();
    },
    staleTime: 60000,
  });

  const rankingsQuery = useQuery<{ altaRankings: SeparateRanking[]; window: any; totalMentions: number }>({
    queryKey: ['crypto-rankings', region, periodType, windowIndex],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=rankings`, {
        method: 'POST', headers,
        body: JSON.stringify({ accessCode: getAccessCode(), region, periodType, windowIndex }),
      });
      if (!resp.ok) throw new Error('Failed to fetch rankings');
      return resp.json();
    },
    staleTime: 30000,
  });

  const submitAnalysis = async (
    images: AnalysisImage[],
    cryptoSymbols: string[],
    title: string,
    sessionTime?: string,
  ) => {
    setIsAnalyzing(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=analyze`, {
        method: 'POST', headers,
        body: JSON.stringify({
          images: images.map(img => ({ name: img.name, base64: img.base64, type: img.type })),
          cryptoSymbols, title, sessionTime,
          accessCode: getAccessCode(),
          region,
        }),
      });
      if (resp.status === 429) { toast({ title: 'Limite atingido', description: 'Tente novamente em alguns minutos.', variant: 'destructive' }); return null; }
      if (resp.status === 402) { toast({ title: 'Créditos esgotados', variant: 'destructive' }); return null; }
      if (!resp.ok) throw new Error('Erro na análise');
      const data = await resp.json();
      toast({ title: 'Análise concluída!', description: `RA registrado em ${region === 'asia' ? 'Ásia' : 'Ocidente'}.` });
      queryClient.invalidateQueries({ queryKey: ['crypto-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-rankings'] });
      return data.analysis;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally { setIsAnalyzing(false); }
  };

  const generatePeriodicReport = async (period: PeriodType, winIdx = 0) => {
    setIsGeneratingReport(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=generate-periodic`, {
        method: 'POST', headers,
        body: JSON.stringify({ periodType: period, windowIndex: winIdx, accessCode: getAccessCode(), region }),
      });
      if (!resp.ok) throw new Error('Erro ao gerar relatório');
      const data = await resp.json();
      toast({ title: 'Relatório gerado!', description: `${period} criado.` });
      queryClient.invalidateQueries({ queryKey: ['periodic-reports'] });
      return data.report;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally { setIsGeneratingReport(false); }
  };

  const deleteAnalyses = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=delete`, {
        method: 'POST', headers,
        body: JSON.stringify({ ids, accessCode: getAccessCode() }),
      });
      if (!resp.ok) throw new Error('Erro ao apagar');
      toast({ title: 'Apagado!', description: `${ids.length} relatório(s) removido(s).` });
      queryClient.invalidateQueries({ queryKey: ['crypto-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-rankings'] });
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  const refreshLists = async (period: PeriodType = 'weekly', winIdx = 0) => {
    setIsRefreshingLists(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=refresh-lists`, {
        method: 'POST', headers,
        body: JSON.stringify({ periodType: period, windowIndex: winIdx, accessCode: getAccessCode(), region }),
      });
      if (resp.status === 429) { toast({ title: 'Limite atingido', variant: 'destructive' }); return null; }
      if (!resp.ok) throw new Error('Erro ao atualizar listas');
      const data = await resp.json();
      const total = data.altaRankings?.length || 0;
      toast({
        title: total === 0 ? 'Listas atualizadas (vazias)' : 'Listas atualizadas!',
        description: total === 0
          ? 'Nenhuma menção encontrada neste recorte.'
          : `LA: ${total} criptos • IA: ${data.aiModelUsed || 'sem IA'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['crypto-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['periodic-reports'] });
      return data;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally { setIsRefreshingLists(false); }
  };

  return {
    isAnalyzing, isGeneratingReport, isDeleting, isRefreshingLists,
    submitAnalysis, generatePeriodicReport, deleteAnalyses, refreshLists,
    history: historyQuery.data?.analyses || [],
    isLoadingHistory: historyQuery.isLoading,
    altaRankings: rankingsQuery.data?.altaRankings || [],
    rankingsWindow: rankingsQuery.data?.window,
    isLoadingRankings: rankingsQuery.isLoading,
    periodicReports: periodicReportsQuery.data?.reports || [],
    isLoadingPeriodicReports: periodicReportsQuery.isLoading,
  };
};
