import { motion } from 'framer-motion';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketData, VolumeCorrelation } from '@/types/market';
import { formatVolume } from '@/lib/mockData';

interface MarketComparisonProps {
  markets: MarketData[];
  correlations: VolumeCorrelation[];
}

const COMPARISON_ORDER = ['ewj', 'ewg', 'ewy', 'inda', 'vgk', 'nya', 'spy', 'qqq', 'bvsp', 'petr4', 'btc', 'cryptoglobal'];

export const MarketComparison = ({ markets, correlations }: MarketComparisonProps) => {
  if (markets.length < 2) return null;

  const orderedMarkets = [...markets].sort((a, b) => {
    const ai = COMPARISON_ORDER.indexOf(a.id);
    const bi = COMPARISON_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const getCorrelationColor = (corr: number) => {
    if (corr > 0.5) return 'text-bullish';
    if (corr < -0.5) return 'text-bearish';
    return 'text-warning';
  };

  const getCorrelationLabel = (corr: number) => {
    if (corr > 0.7) return 'Muito Parecidos';
    if (corr > 0.3) return 'Parecidos';
    if (corr > -0.3) return 'Sem Relação';
    if (corr > -0.7) return 'Opostos';
    return 'Muito Opostos';
  };

  const getCorrelationIcon = (corr: number) => {
    if (corr > 0.3) return <TrendingUp className="w-4 h-4" />;
    if (corr < -0.3) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  // Get comparison data between first two markets
  const compareMarkets = (m1: MarketData, m2: MarketData) => {
    const volumeDiff = ((m1.volumeRatio - m2.volumeRatio) / m2.volumeRatio) * 100;
    const convictionDiff = m1.convictionScore - m2.convictionScore;
    const zScoreDiff = m1.zScore - m2.zScore;
    
    return { volumeDiff, convictionDiff, zScoreDiff };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Comparação de Mercados
        </h2>
      </div>

      {/* Correlation Matrix */}
      <div className="mb-6">
        <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
          Volume: Quão Parecidos Estão?
        </h3>
        <div className="grid gap-2">
          {correlations.map((corr, index) => (
            <motion.div
              key={corr.pair}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold">{corr.pair}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 ${getCorrelationColor(corr.correlation)}`}>
                  {getCorrelationIcon(corr.correlation)}
                  <span className="font-mono font-bold">
                    {corr.correlation > 0 ? '+' : ''}{(corr.correlation * 100).toFixed(0)}%
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {getCorrelationLabel(corr.correlation)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Side by Side Comparison */}
      <div>
        <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
          Comparativo Lado a Lado
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Métrica</th>
                {orderedMarkets.map(market => (
                  <th key={market.id} className="text-right py-2 px-2 font-medium">
                    <span className="flex items-center justify-end gap-1">
                      <span>{market.flag}</span>
                      <span>{market.ticker}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="py-2 px-2 text-muted-foreground">Volume vs Média</td>
                {orderedMarkets.map(market => (
                  <td key={market.id} className="py-2 px-2 text-right font-mono">
                    <span className={market.volumeRatio > 1.2 ? 'text-bullish' : market.volumeRatio < 0.8 ? 'text-bearish' : ''}>
                      {market.volumeRatio.toFixed(2)}x
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 px-2 text-muted-foreground">Atividade Extrema (Z-Score)</td>
                {orderedMarkets.map(market => (
                  <td key={market.id} className="py-2 px-2 text-right font-mono">
                    <span className={market.zScore > 1.5 ? 'text-bullish' : market.zScore < -1.5 ? 'text-bearish' : ''}>
                      {market.zScore > 0 ? '+' : ''}{market.zScore.toFixed(2)}σ
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 px-2 text-muted-foreground">Força Institucional</td>
                {orderedMarkets.map(market => (
                  <td key={market.id} className="py-2 px-2 text-right font-mono">
                    <span className={market.convictionScore >= 7 ? 'text-bullish' : market.convictionScore <= 4 ? 'text-bearish' : 'text-warning'}>
                      {market.convictionScore.toFixed(1)}/10
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 px-2 text-muted-foreground">Variação Preço</td>
                {orderedMarkets.map(market => (
                  <td key={market.id} className="py-2 px-2 text-right font-mono">
                    <span className={market.priceChange >= 0 ? 'text-bullish' : 'text-bearish'}>
                      {market.priceChange >= 0 ? '+' : ''}{market.priceChange.toFixed(2)}%
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-2 text-muted-foreground">Fluxo</td>
                {orderedMarkets.map(market => (
                  <td key={market.id} className="py-2 px-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      market.flowType === 'accumulation' ? 'bg-bullish/20 text-bullish' :
                      market.flowType === 'distribution' ? 'bg-bearish/20 text-bearish' :
                      market.flowType === 'exhaustion' ? 'bg-warning/20 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {market.flowType === 'accumulation' ? 'Acumulação' :
                       market.flowType === 'distribution' ? 'Distribuição' :
                       market.flowType === 'exhaustion' ? 'Exaustão' : 'Neutro'}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Flow Summary */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Melhor Oportunidade (Maior Força):</span>
          <span className="font-semibold text-primary">
            {[...markets].sort((a, b) => b.convictionScore - a.convictionScore)[0]?.name || 'N/A'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};