import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, Sparkles, Loader2, Radio, Clock, Crown } from 'lucide-react';
import { useOperationalRound } from '@/hooks/useOperationalRound';
import { formatBRTime, formatBRDateTime } from '@/lib/brTime';

function formatTime(iso: string): string {
  return formatBRTime(iso);
}

function formatDateTime(iso: string): string {
  return formatBRDateTime(iso, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Fresh under 75min (covers the hourly Make.com run + some slack), then a warning
// window, then treated as stale — the UI never blanks out, it just says how old it is.
function freshnessOf(iso: string): { level: 'fresh' | 'warning' | 'stale'; minutesAgo: number } {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutesAgo <= 75) return { level: 'fresh', minutesAgo };
  if (minutesAgo <= 240) return { level: 'warning', minutesAgo };
  return { level: 'stale', minutesAgo };
}

const trendStyles: Record<string, { icon: typeof ArrowUp; color: string; bg: string; label: string }> = {
  up: { icon: ArrowUp, color: 'text-bullish', bg: 'bg-bullish/10 border-bullish/30', label: 'Subindo' },
  down: { icon: ArrowDown, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Caindo' },
  flat: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-secondary/20 border-border/30', label: 'Estável' },
  new: { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10 border-primary/30', label: 'Novo' },
};

export const OperationalDashboard = () => {
  // undefined = live mode: always follows whatever round the backend resolves as
  // "current" on each 60s refetch. Only set when the user explicitly picks an
  // older round from the switcher below — picking "Atual" clears it back to live.
  const [pinnedRoundId, setPinnedRoundId] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useOperationalRound(pinnedRoundId);

  const freshness = useMemo(() => (data?.timestamp ? freshnessOf(data.timestamp) : null), [data?.timestamp]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!data || data.rounds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma rodada recebida ainda.</p>
        <p className="text-xs mt-1">Assim que a VPS enviar o primeiro relatório, ele aparece aqui automaticamente.</p>
      </div>
    );
  }

  const statusDot = {
    fresh: 'bg-bullish shadow-[0_0_8px_hsl(var(--bullish)/0.6)]',
    warning: 'bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.6)]',
    stale: 'bg-bearish/70',
  }[freshness?.level ?? 'stale'];

  const statusText = {
    fresh: 'Dado fresco',
    warning: 'Aguardando nova remessa',
    stale: 'Sem atualização recente',
  }[freshness?.level ?? 'stale'];

  const rankings = data.rankings || [];
  const leader = rankings[0];
  const rest = rankings.slice(1);
  const leaderMax = leader?.count || 1;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot} ${freshness?.level === 'fresh' ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{statusText}</span>
          </div>
          {isFetching && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="text-lg font-bold text-foreground">
            Última leitura: {data.timestamp ? formatDateTime(data.timestamp) : '-'}
          </span>
        </div>
        {freshness && freshness.level !== 'fresh' && (
          <p className="text-xs text-muted-foreground">
            Há {freshness.minutesAgo < 60 ? `${freshness.minutesAgo} min` : `${Math.round(freshness.minutesAgo / 60)}h`} sem nova remessa, exibindo a última rodada válida.
          </p>
        )}
        {data.isFallbackFromPreviousDay && (
          <p className="text-xs text-warning/90">Nenhum envio hoje ainda, mostrando a última rodada disponível.</p>
        )}
      </div>

      {/* Round switcher */}
      {data.rounds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {data.rounds.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setPinnedRoundId(i === 0 ? undefined : r.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap
                ${r.id === data.selectedRoundId
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}
            >
              {i === 0 ? 'Atual' : formatTime(r.timestamp)}
            </button>
          ))}
        </div>
      )}

      {/* Leader card — apuração em destaque */}
      {leader && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border-[1.5px] border-primary bg-gradient-to-b from-card to-card/60 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-primary to-sky-600 text-base font-extrabold text-primary-foreground">
              {leader.symbol.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-extrabold text-foreground truncate">{leader.symbol}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider text-primary-foreground shrink-0">
                  <Crown className="w-2.5 h-2.5" /> LÍDER
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Posição #{leader.rank} nesta rodada</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-primary leading-none tabular-nums">{leader.count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">menções</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-secondary/30 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500" style={{ width: '100%' }} />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-bullish/10 border border-bullish/30 px-2 py-0.5 text-[10px] font-bold text-bullish">
              {leader.trend === 'up' && '▲ Subindo'}
              {leader.trend === 'down' && '▼ Caindo'}
              {leader.trend === 'flat' && '■ Estável no topo'}
              {leader.trend === 'new' && '✦ Nova liderança'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {leader.previousCount !== null ? `Rodada anterior: ${leader.previousCount}` : 'Sem rodada anterior'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Ranking cards */}
      <div className="space-y-1.5">
        {rest.map((r, i) => {
          const style = trendStyles[r.trend];
          const Icon = style.icon;
          const barPct = Math.max(6, Math.round((r.count / leaderMax) * 100));
          return (
            <motion.div
              key={r.symbol}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30"
            >
              <span className={`text-xs font-bold w-6 text-center shrink-0 ${i < 2 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                #{r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-foreground">{r.symbol}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{r.count}</span>
                </div>
                <div className="h-1 rounded-full bg-secondary/30 overflow-hidden">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${barPct}%` }} />
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${style.bg} ${style.color}`}>
                <Icon className="w-3 h-3" />
                {r.previousCount !== null ? r.previousCount : style.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
