import { useState } from 'react';
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

interface RankingEntry {
  symbol: string;
  total: number;
  alta: number;
  baixa: number;
  volume: number;
}

interface SeparateRanking {
  symbol: string;
  count: number;
}

interface PeriodicReport {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  year: number;
  week_number: number;
  rankings: RankingEntry[];
  summary: string;
  ai_analysis: string;
  created_at: string;
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analysis`;
const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  'Content-Type': 'application/json',
};

export const useCryptoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingLists, setIsRefreshingLists] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getAccessCode = () => localStorage.getItem('crypto_access_code') || undefined;

  const historyQuery = useQuery<{ analyses: CryptoAnalysis[] }>({
    queryKey: ['crypto-analyses'],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=history`, {
        method: 'POST', headers, body: JSON.stringify({ accessCode: getAccessCode() }),
      });
      if (!resp.ok) throw new Error('Failed to fetch history');
      return resp.json();
    },
    staleTime: 60000,
  });

  const periodicReportsQuery = useQuery<{ reports: PeriodicReport[] }>({
    queryKey: ['periodic-reports'],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=periodic-reports`, {
        method: 'POST', headers, body: JSON.stringify({ accessCode: getAccessCode() }),
      });
      if (!resp.ok) throw new Error('Failed to fetch periodic reports');
      return resp.json();
    },
    staleTime: 60000,
  });

  const rankingsQuery = useQuery<{ rankings: RankingEntry[]; altaRankings: SeparateRanking[]; baixaRankings: SeparateRanking[] }>({
    queryKey: ['crypto-rankings'],
    queryFn: async () => {
      const now = new Date();
      const weekNumber = getISOWeek(now);
      const resp = await fetch(`${BASE_URL}?action=rankings`, {
        method: 'POST', headers,
        body: JSON.stringify({ periodType: 'weekly', year: now.getFullYear(), weekNumber, accessCode: getAccessCode() }),
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
    reportType?: string,
    sessionTime?: string,
  ) => {
    setIsAnalyzing(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=analyze`, {
        method: 'POST', headers,
        body: JSON.stringify({
          images: images.map(img => ({ name: img.name, base64: img.base64, type: img.type })),
          cryptoSymbols, title, reportType, sessionTime,
          accessCode: getAccessCode(),
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
      queryClient.invalidateQueries({ queryKey: ['crypto-rankings'] });
      return data.analysis;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePeriodicReport = async (periodType: string) => {
    setIsGeneratingReport(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=generate-periodic`, {
        method: 'POST', headers,
        body: JSON.stringify({ periodType, accessCode: getAccessCode() }),
      });
      if (!resp.ok) throw new Error('Erro ao gerar relatório');
      const data = await resp.json();
      toast({ title: 'Relatório gerado!', description: `Relatório ${periodType} criado com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['periodic-reports'] });
      return data.report;
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const deleteAnalyses = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      const resp = await fetch(`${BASE_URL}?action=delete`, {
        method: 'POST', headers,
        body: JSON.stringify({ ids, accessCode: getAccessCode() }),
      });
      if (!resp.ok) throw new Error('Erro ao apagar relatórios');
      toast({ title: 'Apagado!', description: `${ids.length} relatório(s) removido(s).` });
      queryClient.invalidateQueries({ queryKey: ['crypto-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-rankings'] });
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isAnalyzing,
    isGeneratingReport,
    isDeleting,
    submitAnalysis,
    generatePeriodicReport,
    deleteAnalyses,
    history: historyQuery.data?.analyses || [],
    isLoadingHistory: historyQuery.isLoading,
    rankings: rankingsQuery.data?.rankings || [],
    altaRankings: rankingsQuery.data?.altaRankings || [],
    baixaRankings: rankingsQuery.data?.baixaRankings || [],
    isLoadingRankings: rankingsQuery.isLoading,
    periodicReports: periodicReportsQuery.data?.reports || [],
    isLoadingPeriodicReports: periodicReportsQuery.isLoading,
  };
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
