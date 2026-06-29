import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeparateRanking { symbol: string; count: number; }

interface RegionWindowDashboardProps {
  altaRankings: SeparateRanking[];
  isLoading: boolean;
  windowLabel?: string;
  totalMentions?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RegionWindowDashboard = ({
  altaRankings, isLoading, windowLabel, totalMentions, onRefresh, isRefreshing,
}: RegionWindowDashboardProps) => {
  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;
  }

  const maxCount = altaRankings[0]?.count || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Lista Geral (somatório)
          {windowLabel && <span className="text-xs text-muted-foreground">— {windowLabel}</span>}
        </h3>
        {onRefresh && (
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing} className="h-7 gap-1 text-xs">
            {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Reprocessar + IA
          </Button>
        )}
      </div>

      {totalMentions !== undefined && (
        <p className="text-xs text-muted-foreground">
          Total de menções neste recorte: <span className="font-mono text-foreground">{totalMentions}</span>
        </p>
      )}

      {altaRankings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum dado neste recorte</p>
          <p className="text-xs mt-1">Envie arquivos .CSV na aba "Enviar"</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {altaRankings.map((r, i) => (
            <motion.div
              key={r.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/30"
            >
              <span className={`text-xs font-bold w-6 text-center ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                #{i + 1}
              </span>
              <span className="font-mono text-sm font-semibold text-foreground w-20">{r.symbol}</span>
              <div className="flex-1">
                <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500/60"
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground w-8 text-right">{r.count}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
