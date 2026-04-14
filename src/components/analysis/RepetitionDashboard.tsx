import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RankingEntry {
  symbol: string;
  total: number;
  alta: number;
  baixa: number;
  volume: number;
}

interface SeparateRanking {
  symbol: string;
  count: number;
}

interface RepetitionDashboardProps {
  rankings: RankingEntry[];
  altaRankings?: SeparateRanking[];
  baixaRankings?: SeparateRanking[];
  isLoading: boolean;
}

const RankingList = ({ items, color, icon: Icon }: { items: SeparateRanking[]; color: string; icon: any }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Icon className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-xs">Nenhum dado ainda. Envie relatórios para popular esta lista.</p>
      </div>
    );
  }

  const maxCount = items[0]?.count || 1;

  return (
    <div className="space-y-1.5">
      {items.slice(0, 15).map((r, i) => (
        <motion.div
          key={r.symbol}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
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
                animate={{ width: `${(r.count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className={`h-full rounded-full ${color}`}
              />
            </div>
          </div>
          <span className="text-sm font-bold text-foreground w-8 text-right">{r.count}</span>
        </motion.div>
      ))}
    </div>
  );
};

export const RepetitionDashboard = ({ rankings, altaRankings = [], baixaRankings = [], isLoading }: RepetitionDashboardProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  // Derive alta/baixa from combined rankings if separate not provided
  const alta = altaRankings.length > 0
    ? altaRankings
    : rankings.filter(r => r.alta > 0).map(r => ({ symbol: r.symbol, count: r.alta })).sort((a, b) => b.count - a.count);

  const baixa = baixaRankings.length > 0
    ? baixaRankings
    : rankings.filter(r => r.baixa > 0).map(r => ({ symbol: r.symbol, count: r.baixa })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">📖 Como funciona o Ranking?</p>
        <p>Este painel mostra as criptos que mais aparecem nos seus relatórios da <strong>semana atual</strong> (segunda a domingo), separadas em:</p>
        <p><span className="text-emerald-400">📈 Lista de Alta (LA)</span> — criptos dos relatórios RA (Alta)</p>
        <p><span className="text-red-400">📉 Lista de Baixa (LB)</span> — criptos dos relatórios RB (Baixa)</p>
        <p>Quanto mais repetições, mais vezes a cripto apareceu nos relatórios do CriptoEx neste período.</p>
      </div>

      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Ranking Semanal — LA & LB
        <InfoTooltip text="Ranking separado por Lista de Alta (LA) e Lista de Baixa (LB). Os dados vêm dos relatórios RA e RB enviados na semana atual." />
      </h3>

      {rankings.length === 0 && alta.length === 0 && baixa.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum dado de repetição ainda</p>
          <p className="text-xs mt-1">Envie relatórios RA e RB na aba "Enviar" para começar</p>
        </div>
      ) : (
        <Tabs defaultValue="alta" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="alta" className="text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              Lista de Alta (LA) ({alta.length})
            </TabsTrigger>
            <TabsTrigger value="baixa" className="text-xs gap-1">
              <TrendingDown className="w-3 h-3" />
              Lista de Baixa (LB) ({baixa.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alta" className="mt-2">
            <RankingList items={alta} color="bg-gradient-to-r from-emerald-500 to-emerald-500/60" icon={TrendingUp} />
          </TabsContent>

          <TabsContent value="baixa" className="mt-2">
            <RankingList items={baixa} color="bg-gradient-to-r from-red-500 to-red-500/60" icon={TrendingDown} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
