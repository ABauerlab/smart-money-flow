import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { GlobalMetrics } from '@/types/market';

interface VerdictBannerProps {
  metrics: GlobalMetrics;
}

export const VerdictBanner = ({ metrics }: VerdictBannerProps) => {
  const getSentimentIcon = () => {
    switch (metrics.riskSentiment) {
      case 'risk-on':
        return <TrendingUp className="w-5 h-5" />;
      case 'risk-off':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <ArrowRightLeft className="w-5 h-5" />;
    }
  };

  const getSentimentColor = () => {
    switch (metrics.riskSentiment) {
      case 'risk-on':
        return 'text-bullish border-bullish/30 bg-bullish/5';
      case 'risk-off':
        return 'text-bearish border-bearish/30 bg-bearish/5';
      default:
        return 'text-warning border-warning/30 bg-warning/5';
    }
  };

  const getSentimentLabel = () => {
    switch (metrics.riskSentiment) {
      case 'risk-on':
        return 'RISK-ON';
      case 'risk-off':
        return 'RISK-OFF';
      default:
        return 'NEUTRO';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-6"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 animate-pulse-glow">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Veredito: Onde está o dinheiro agora?
            </h2>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getSentimentColor()}`}>
              {getSentimentIcon()}
              <span>{getSentimentLabel()}</span>
            </div>
          </div>
          
          <p className="text-lg text-foreground leading-relaxed">
            {metrics.verdict}
          </p>
          
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Mercado Quente:</span>
              <span className="text-sm font-semibold text-primary">{metrics.hotMarket}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Fluxo Dominante:</span>
              <span className={`text-sm font-semibold ${
                metrics.dominantFlow === 'inflow' ? 'text-bullish' : 
                metrics.dominantFlow === 'outflow' ? 'text-bearish' : 'text-warning'
              }`}>
                {metrics.dominantFlow === 'inflow' ? '↑ Entrada' : 
                 metrics.dominantFlow === 'outflow' ? '↓ Saída' : '↔ Equilibrado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
