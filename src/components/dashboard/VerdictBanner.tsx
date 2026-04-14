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
        return <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'risk-off':
        return <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />;
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
        return 'BUSCA POR RISCO';
      case 'risk-off':
        return 'FUGA DE RISCO';
      default:
        return 'NEUTRO';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2 sm:p-3 rounded-xl bg-primary/10 animate-pulse-glow flex-shrink-0">
          <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Veredito: Onde está o dinheiro agora?
            </h2>
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-bold ${getSentimentColor()}`}>
              {getSentimentIcon()}
              <span className="whitespace-nowrap">{getSentimentLabel()}</span>
            </div>
          </div>
          
          <p className="text-sm sm:text-lg text-foreground leading-relaxed">
            {metrics.verdict}
          </p>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Mercado Mais Ativo:</span>
              <span className="text-xs sm:text-sm font-semibold text-primary truncate">{metrics.hotMarket}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Fluxo Global:</span>
              <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                metrics.dominantFlow === 'inflow' ? 'text-bullish' : 
                metrics.dominantFlow === 'outflow' ? 'text-bearish' : 'text-warning'
              }`}>
                {metrics.dominantFlow === 'inflow' ? '↑ Entrada de Capital' : 
                 metrics.dominantFlow === 'outflow' ? '↓ Saída de Capital' : '↔ Equilibrado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
