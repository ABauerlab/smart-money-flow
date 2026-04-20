import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface RankingRow {
  symbol: string;
  count: number;
}

interface RankingTableProps {
  rows: RankingRow[];
  type: 'alta' | 'baixa';
  maxRows?: number;
}

/**
 * Clean, no-emoji ranking table with progress bars.
 * Used in periodic reports and analysis reports.
 */
export const RankingTable = ({ rows, type, maxRows = 30 }: RankingTableProps) => {
  const isAlta = type === 'alta';
  const visible = rows.slice(0, maxRows);
  const maxCount = Math.max(...visible.map(r => r.count), 1);

  const accent = isAlta
    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
    : 'border-red-500/30 bg-red-500/[0.04]';
  const headerAccent = isAlta
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
    : 'bg-red-500/15 text-red-300 border-red-500/20';
  const barColor = isAlta
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : 'bg-gradient-to-r from-red-500 to-red-400';
  const valueColor = isAlta ? 'text-emerald-300' : 'text-red-300';

  return (
    <div className={`rounded-lg border overflow-hidden ${accent}`}>
      <div className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b ${headerAccent}`}>
        {isAlta ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{isAlta ? 'Lista de Alta (LA)' : 'Lista de Baixa (LB)'}</span>
        <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">{rows.length} criptos</span>
      </div>

      <div className="grid grid-cols-[36px_minmax(60px,80px)_1fr_56px] gap-2 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-secondary/20">
        <span>Pos</span>
        <span>Cripto</span>
        <span>Distribuição</span>
        <span className="text-right">Menç.</span>
      </div>

      <div className="divide-y divide-border/15">
        {visible.map((r, i) => {
          const percent = (r.count / maxCount) * 100;
          return (
            <motion.div
              key={`${type}-${r.symbol}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-[36px_minmax(60px,80px)_1fr_56px] gap-2 px-3 py-2 items-center hover:bg-secondary/10 transition-colors"
            >
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-mono text-sm font-bold text-foreground truncate">{r.symbol}</span>
              <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  className={`h-full ${barColor}`}
                />
              </div>
              <span className={`text-sm font-bold text-right tabular-nums ${valueColor}`}>
                {r.count}
              </span>
            </motion.div>
          );
        })}
      </div>

      {rows.length > maxRows && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-secondary/10 border-t border-border/20">
          Exibindo {maxRows} de {rows.length} criptos
        </div>
      )}
    </div>
  );
};
