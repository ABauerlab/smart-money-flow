import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface RankingEntry {
  symbol: string;
  total: number;
  alta: number;
  baixa: number;
  volume: number;
}

interface RepetitionDashboardProps {
  rankings: RankingEntry[];
  isLoading: boolean;
}

export const RepetitionDashboard = ({ rankings, isLoading }: RepetitionDashboardProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Explainer box */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">📖 O que é o Ranking de Repetições?</p>
        <p>Este ranking mostra quantas vezes cada criptomoeda apareceu nos seus relatórios da <strong>semana atual</strong> (segunda a domingo).</p>
        <p>Quanto mais uma cripto aparece nos relatórios de Alta, Baixa ou Volume, maior é a atenção que ela está recebendo do mercado.</p>
        <p><span className="text-emerald-400">📈 Alta</span> = aparições em relatórios de alta | <span className="text-red-400">📉 Baixa</span> = aparições em relatórios de baixa | <span className="text-blue-400">📊 Vol</span> = aparições em relatórios de volume</p>
      </div>

      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Ranking de Repetições (Semana Atual)
        <InfoTooltip text="Contagem de quantas vezes cada cripto apareceu nos relatórios enviados nesta semana. Ranking atualizado automaticamente a cada envio." />
      </h3>

      {rankings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum dado de repetição ainda</p>
          <p className="text-xs mt-1">Envie relatórios na aba "Enviar" para começar o rastreamento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rankings.slice(0, 15).map((r, i) => {
            const maxTotal = rankings[0]?.total || 1;
            return (
              <motion.div
                key={r.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/30"
              >
                <span className={`text-xs font-bold w-6 text-center ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  #{i + 1}
                </span>
                <span className="font-mono text-sm font-semibold text-foreground w-16">{r.symbol}</span>
                <div className="flex-1">
                  <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(r.total / maxTotal) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-0.5 text-emerald-400" title="Alta">
                    <TrendingUp className="w-3 h-3" />{r.alta}
                  </span>
                  <span className="flex items-center gap-0.5 text-red-400" title="Baixa">
                    <TrendingDown className="w-3 h-3" />{r.baixa}
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-400" title="Volume">
                    <BarChart3 className="w-3 h-3" />{r.volume}
                  </span>
                  <span className="font-bold text-foreground ml-1">{r.total}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
