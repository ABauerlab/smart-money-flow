import { Header } from '@/components/dashboard/Header';
import { VerdictBanner } from '@/components/dashboard/VerdictBanner';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { ConvictionRanking } from '@/components/dashboard/ConvictionRanking';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { ActionSuggestion } from '@/components/dashboard/ActionSuggestion';
import { mockMarketData, mockGlobalMetrics, mockAlerts } from '@/lib/mockData';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Verdict Banner */}
        <VerdictBanner metrics={mockGlobalMetrics} />
        
        {/* Market Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockMarketData.map((market, index) => (
            <MarketCard key={market.id} market={market} index={index} />
          ))}
        </div>
        
        {/* Bottom Grid: Ranking, Alerts, Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConvictionRanking markets={mockMarketData} />
          
          <div className="space-y-6">
            <AlertsPanel alerts={mockAlerts} />
            <ActionSuggestion hotMarket={mockGlobalMetrics.hotMarket} />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-4 mt-8">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <span>Smart Money Flow Tracker v1.0</span>
          <span className="font-mono">Volume Relativo = Métrica Suprema</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
