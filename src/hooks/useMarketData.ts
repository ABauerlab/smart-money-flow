import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketData, GlobalMetrics, Alert, VolumeCorrelation, NewsArticle } from '@/types/market';
import { mockMarketData, mockGlobalMetrics, mockAlerts } from '@/lib/mockData';

// Ordem de exibição definida pelo usuário
const MARKET_ORDER = ['inda', 'ewy', 'ewg', 'ewj', 'qqq', 'spy', 'nya', 'vgk', 'cryptoglobal', 'btc', 'petr4', 'bvsp'];

const sortMarkets = (markets: MarketData[]): MarketData[] => {
  return [...markets].sort((a, b) => {
    const ai = MARKET_ORDER.indexOf(a.id);
    const bi = MARKET_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

interface MarketDataResponse {
  markets: MarketData[];
  globalMetrics: GlobalMetrics;
  alerts: Alert[];
  correlations: VolumeCorrelation[];
  news: NewsArticle[];
  lastUpdated: string;
}

export const useMarketData = () => {
  return useQuery<MarketDataResponse>({
    queryKey: ['market-data'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke<MarketDataResponse>('market-data');

        if (error) {
          console.error('Error fetching market data:', error);
          throw error;
        }

        if (!data || !data.markets || data.markets.length === 0) {
          console.warn('No market data received, using mock data');
          return {
            markets: sortMarkets(mockMarketData),
            globalMetrics: mockGlobalMetrics,
            alerts: mockAlerts.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })) as unknown as Alert[],
            correlations: [],
            news: [],
            lastUpdated: new Date().toISOString(),
          };
        }

        const alertsWithDates = data.alerts.map(alert => ({
          ...alert,
          timestamp: new Date(alert.timestamp as unknown as string),
        }));

        return {
          ...data,
          markets: sortMarkets(data.markets),
          alerts: alertsWithDates,
        };
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        return {
          markets: sortMarkets(mockMarketData),
          globalMetrics: mockGlobalMetrics,
          alerts: mockAlerts,
          correlations: [],
          news: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};