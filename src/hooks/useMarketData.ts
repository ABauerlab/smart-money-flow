import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketData, GlobalMetrics, Alert, VolumeCorrelation } from '@/types/market';
import { mockMarketData, mockGlobalMetrics, mockAlerts } from '@/lib/mockData';

interface MarketDataResponse {
  markets: MarketData[];
  globalMetrics: GlobalMetrics;
  alerts: Alert[];
  correlations: VolumeCorrelation[];
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
            markets: mockMarketData,
            globalMetrics: mockGlobalMetrics,
            alerts: mockAlerts.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })) as unknown as Alert[],
            correlations: [],
            lastUpdated: new Date().toISOString(),
          };
        }

        // Convert timestamp strings to Date objects for alerts
        const alertsWithDates = data.alerts.map(alert => ({
          ...alert,
          timestamp: new Date(alert.timestamp as unknown as string),
        }));

        return {
          ...data,
          alerts: alertsWithDates,
        };
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        return {
          markets: mockMarketData,
          globalMetrics: mockGlobalMetrics,
          alerts: mockAlerts,
          correlations: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
};
