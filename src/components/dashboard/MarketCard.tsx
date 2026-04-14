import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { MarketData } from '@/types/market';
import { formatVolume, formatPrice, getFlowTypeLabel } from '@/lib/mockData';

interface MarketCardProps {
  market: MarketData;
  index: number;
}

export const MarketCard = ({ market, index }: MarketCardProps) => {
  const isPositive = market.priceChange >= 0;
  const isHot = market.zScore > 1.5;
  
  const getFlowColor = () => {
    switch (market.flowType) {
      case 'accumulation':
        return 'bg-bullish/20 text-bullish border-bullish/30';
      case 'distribution':
        return 'bg-bearish/20 text-bearish border-bearish/30';
      case 'exhaustion':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getCardGlow = () => {
    if (!isHot) return '';
    return market.flowType === 'accumulation' ? 'glow-bullish' : 
           market.flowType === 'distribution' ? 'glow-bearish' : '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className={`glass-card p-4 sm:p-5 relative overflow-hidden ${getCardGlow()}`}
    >
      {isHot && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs font-bold animate-pulse">
            <Activity className="w-3 h-3" />
            QUENTE
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <span className="text-xl sm:text-2xl flex-shrink-0">{market.flag}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{market.name}</h3>
          <span className="text-[10px] sm:text-xs font-mono text-muted-foreground">{market.ticker}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Preço Atual</p>
          <p className="text-sm sm:text-lg font-semibold font-mono truncate">
            {formatPrice(market.price, market.currency)}
          </p>
          <div className={`flex items-center gap-1 text-xs sm:text-sm ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
            <span className="font-mono truncate">{isPositive ? '+' : ''}{market.priceChange.toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Volume 24h</p>
          <p className="text-sm sm:text-lg font-semibold font-mono truncate">
            {market.currentVolume > 0 ? formatVolume(market.currentVolume) : '—'}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
            {market.averageVolume > 0 ? `Média: ${formatVolume(market.averageVolume)}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
            <span className="text-muted-foreground">Volume vs Média</span>
            <span className={`font-mono font-semibold ${
              market.volumeRatio > 1.2 ? 'text-bullish' : 
              market.volumeRatio < 0.8 ? 'text-bearish' : 'text-foreground'
            }`}>
              {market.volumeRatio.toFixed(2)}x
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(market.volumeRatio * 50, 100)}%` }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
              className={`h-full rounded-full ${
                market.volumeRatio > 1.2 ? 'bg-bullish' : 
                market.volumeRatio < 0.8 ? 'bg-bearish' : 'bg-primary'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50 gap-2">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Z-Score:</span>
            <span className={`text-xs sm:text-sm font-mono font-semibold whitespace-nowrap ${
              market.zScore > 1.5 ? 'text-bullish' : 
              market.zScore < -1.5 ? 'text-bearish' : 'text-foreground'
            }`}>
              {market.zScore > 0 ? '+' : ''}{market.zScore.toFixed(1)}σ
            </span>
          </div>
          
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getFlowColor()}`}>
            {getFlowTypeLabel(market.flowType)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
