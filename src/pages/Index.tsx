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
          <p className="text-muted-foreground">Sincronizando com terminais globais...</p>
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
        {globalMetrics && <VerdictBanner metrics={globalMetrics} />}
        
        {/* Grid de Mercados - Responsivo para muitos itens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {markets.map((market, index) => (
            <MarketCard key={market.id} market={market} index={index} />
          ))}
        </div>

        {/* Gráficos com Filtros e Visão Mensal */}
        {markets.length > 0 && <VolumeCharts markets={markets} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {markets.length > 1 && correlations && (
              <MarketComparison markets={markets} correlations={correlations} />
            )}
            <LiquidityRanking markets={markets} />
          </div>
          
          <div className="space-y-6">
            <AlertsPanel alerts={alerts} />
            {globalMetrics && <ActionSuggestion hotMarket={globalMetrics.hotMarket} />}
            {news && <NewsPanel news={news} />}
          </div>
        </div>
      </main>
      
      <footer className="border-t border-border/50 py-6 mt-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Smart Nelson Money v1.2</span>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">TERMINAL ATIVO</span>
          </div>
          <span className="font-mono">© 2024 BauerLab • Dados Institucionais em Tempo Real</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;