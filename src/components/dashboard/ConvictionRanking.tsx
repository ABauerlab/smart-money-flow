import { motion } from 'framer-motion';
import { Trophy, Flame } from 'lucide-react';
import { MarketData } from '@/types/market';
import { getFlowTypeLabel, getFlowTypeDescription } from '@/lib/mockData';

interface ConvictionRankingProps {
  markets: MarketData[];
}

export const ConvictionRanking = ({ markets }: ConvictionRankingProps) => {
  const sortedMarkets = [...markets].sort((a, b) => b.convictionScore - a.convictionScore);

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-bullish';
    if (score >= 4) return 'text-warning';
    return 'text-bearish';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 7) return 'bg-bullish';
    if (score >= 4) return 'bg-warning';
    return 'bg-bearish';
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning text-primary-foreground">
            <Trophy className="w-4 h-4" />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground text-primary-foreground">
            <span className="text-sm font-bold">2</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
            <span className="text-sm font-bold">3</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-muted-foreground">
            <span className="text-sm font-bold">{index + 1}</span>
          </div>
        );
    }
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
          <Flame className="w-5 h-5 text-warning" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ranking de Força Institucional (0-10)
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
              index === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-secondary/20'
            }`}
          >
            <div className="flex items-start gap-4">
              {getRankBadge(index)}
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{market.flag}</span>
                    <span className="font-semibold">{market.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">({market.ticker})</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${getScoreColor(market.convictionScore)}`}>
                    {market.convictionScore.toFixed(1)}
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                </div>

                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${market.convictionScore * 10}%` }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
                    className={`h-full rounded-full ${getScoreBarColor(market.convictionScore)}`}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground/80">{getFlowTypeLabel(market.flowType)}:</span>{' '}
                  {getFlowTypeDescription(market.flowType)}
                </p>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Volume vs Média: <span className="font-mono text-foreground">{market.volumeRatio.toFixed(2)}x</span></span>
                  <span>Atividade Extrema: <span className="font-mono text-foreground">{market.zScore > 0 ? '+' : ''}{market.zScore.toFixed(1)}σ</span></span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};