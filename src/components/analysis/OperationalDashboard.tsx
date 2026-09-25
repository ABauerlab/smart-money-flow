import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, Sparkles, Loader2, Radio, Clock } from 'lucide-react';
import { useOperationalRound } from '@/hooks/useOperationalRound';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
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
  up: { icon: ArrowUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Subindo' },
  down: { icon: ArrowDown, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Caindo' },
  flat: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-secondary/20 border-border/30', label: 'Estável' },
  new: { icon: Sparkles, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', label: 'Novo' },
};

export const OperationalDashboard = () => {
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useOperationalRound(selectedRoundId);

  // Once the "current" query resolves, lock the selector onto that round's real id so
  // switching between rounds doesn't jump back to "latest" on the next 60s refetch.
  useEffect(() => {
    if (!selectedRoundId && data?.selectedRoundId) setSelectedRoundId(data.selectedRoundId);
  }, [data?.selectedRoundId, selectedRoundId]);

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
    fresh: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    stale: 'bg-red-500/70',
  }[freshness?.level ?? 'stale'];

  const statusText = {
    fresh: 'Dado fresco',
    warning: 'Aguardando nova remessa',
    stale: 'Sem atualização recente',
  }[freshness?.level ?? 'stale'];

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
            Última leitura: {data.timestamp ? formatDateTime(data.timestamp) : '—'}
          </span>
        </div>
        {freshness && freshness.level !== 'fresh' && (
          <p className="text-xs text-muted-foreground">
            Há {freshness.minutesAgo < 60 ? `${freshness.minutesAgo} min` : `${Math.round(freshness.minutesAgo / 60)}h`} sem nova remessa — exibindo a última rodada válida.
          </p>
        )}
        {data.isFallbackFromPreviousDay && (
          <p className="text-xs text-amber-400/90">Nenhum envio hoje ainda — mostrando a última rodada disponível.</p>
        )}
      </div>

      {/* Round switcher */}
      {data.rounds.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {data.rounds.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoundId(r.id)}
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

      {/* Ranking cards */}
      <div className="space-y-1.5">
        {(data.rankings || []).map((r, i) => {
          const style = trendStyles[r.trend];
          const Icon = style.icon;
          return (
            <motion.div
              key={r.symbol}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30"
            >
              <span className={`text-xs font-bold w-6 text-center shrink-0 ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                #{r.rank}
              </span>
              <span className="font-mono text-sm font-bold text-foreground w-16 shrink-0">{r.symbol}</span>
              <div className="flex-1 min-w-0" />
              <span className="text-sm font-bold text-foreground tabular-nums">{r.count}</span>
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
