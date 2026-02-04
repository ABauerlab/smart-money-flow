import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketData } from '@/types/market';

interface LiquidityRankingProps {
  markets: MarketData[];
}

export const LiquidityRanking = ({ markets }: LiquidityRankingProps) => {
  // Sort markets by Volume Ratio (highest liquidity first)
  const sortedMarkets = [...markets].sort((a, b) => b.volumeRatio - a.volumeRatio);

  const getRatioColor = (ratio: number) => {
    if (ratio >= 1.2) return 'text-bullish';
    if (ratio <= 0.8) return 'text-bearish';
    return 'text-warning';
  };

  const getRatioIcon = (ratio: number) => {
    if (ratio >= 1.2) return <TrendingUp className="w-4 h-4" />;
    if (ratio <= 0.8) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-warning/10">
          <Zap className="w-5 h-5 text-warning" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ranking de Liquidez (Volume vs Média)
        </h2>
      </div>

      <div className="space-y-4">
        {sortedMarkets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={`p-4 rounded-lg border ${
              index === 0 && market.volumeRatio > 1.2 ? 'border-bullish/30 bg-bullish/5' : 'border-border/50 bg-secondary/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{market.flag}</span>
                <span className="font-semibold">{market.name}</span>
                <span className="text-xs font-mono text-muted-foreground">({market.ticker})</span>
              </div>
              
              <div className="text-right">
                <div className={`flex items-center gap-2 text-xl font-bold font-mono ${getRatioColor(market.volumeRatio)}`}>
                  {getRatioIcon(market.volumeRatio)}
                  {market.volumeRatio.toFixed(2)}x
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {market.volumeRatio > 1.2 ? 'Mercado Quente' : market.volumeRatio < 0.8 ? 'Mercado Frio' : 'Volume Normal'}
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Fluxo Institucional:</span>
                <span className={`font-semibold ${
                    market.flowType === 'accumulation' ? 'text-bullish' :
                    market.flowType === 'distribution' ? 'text-bearish' :
                    'text-warning'
                }`}>
                    {market.flowType === 'accumulation' ? 'Acumulação' :
                     market.flowType === 'distribution' ? 'Distribuição' :
                     market.flowType === 'exhaustion' ? 'Exaustão' : 'Neutro'}
                </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};