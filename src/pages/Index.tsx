import { useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { VerdictBanner } from '@/components/dashboard/VerdictBanner';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { LiquidityRanking } from '@/components/dashboard/LiquidityRanking';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { ActionSuggestion } from '@/components/dashboard/ActionSuggestion';
import { MarketComparison } from '@/components/dashboard/MarketComparison';
import { VolumeCharts } from '@/components/dashboard/VolumeCharts';
import { NewsPanel } from '@/components/dashboard/NewsPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useNotifications } from '@/hooks/useNotifications';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { data, isLoading, error, dataUpdatedAt } = useMarketData();
  const {
    soundEnabled,
    notificationsEnabled,
    permission,
    toggleSound,
    toggleNotifications,
    processAlerts,
  } = useNotifications();

  // Process alerts for notifications when data updates
  useEffect(() => {
    if (data?.alerts && data.alerts.length > 0) {
      processAlerts(data.alerts);
    }
  }, [data?.alerts, processAlerts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados de mercado...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-bearish text-lg mb-2">Erro ao carregar dados</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  const { markets, globalMetrics, alerts, correlations, news } = data || { 
    markets: [], 
    globalMetrics: null, 
    alerts: [],
    correlations: [],
    news: []
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined}
        soundEnabled={soundEnabled}
        notificationsEnabled={notificationsEnabled}
        notificationPermission={permission}
        onToggleSound={toggleSound}
        onToggleNotifications={toggleNotifications}
      />
      
      <main className="container py-6 space-y-6">
        {/* Verdict Banner */}
        {globalMetrics && <VerdictBanner metrics={globalMetrics} />}
        
        {/* Market Cards Grid: 1 col on mobile, 3 cols on medium/large screens */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {markets.map((market, index) => (
            <MarketCard key={market.id} market={market} index={index} />
          ))}
        </div>

        {/* Volume Charts */}
        {markets.length > 0 && <VolumeCharts markets={markets} />}

        {/* Market Comparison */}
        {markets.length > 1 && correlations && (
          <MarketComparison markets={markets} correlations={correlations} />
        )}
        
        {/* Bottom Grid: Ranking, Alerts, Actions, News (1 col on mobile, 2 cols on large screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiquidityRanking markets={markets} />
          
          <div className="space-y-6">
            <AlertsPanel alerts={alerts} />
            {globalMetrics && <ActionSuggestion hotMarket={globalMetrics.hotMarket} />}
            {news && <NewsPanel news={news} />}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-4 mt-8">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <span>Smart Nelson Money v1.0</span>
          <span className="font-mono">Desenvolvido por Agência BauerLab</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;