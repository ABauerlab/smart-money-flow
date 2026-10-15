import { AlertTriangle } from 'lucide-react';
import { useOperationalRound } from '@/hooks/useOperationalRound';
import { formatBRDateTime } from '@/lib/brTime';

// The reports arrive 4x/day (05:00, 10:30, 13:30, 21:00 Brasília), so the longest
// normal gap between two files is 8h (21:00 -> 05:00). Past 9h with nothing new,
// the numbers in "Listas" are no longer growing and the likely cause is upstream
// (VPS/Make.com not delivering), not the dashboard. Say so, instead of leaving the
// client to discover a "frozen" list on their own.
const STALE_AFTER_MINUTES = 9 * 60;

export const StaleDataBanner = () => {
  // Same query key as the Operação tab, so this costs no extra request.
  const { data } = useOperationalRound();
  if (!data?.timestamp) return null;

  const minutesAgo = Math.round((Date.now() - new Date(data.timestamp).getTime()) / 60000);
  if (minutesAgo < STALE_AFTER_MINUTES) return null;

  const hours = Math.floor(minutesAgo / 60);
  return (
    <div role="status" className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-muted-foreground">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <p>
        O último relatório recebido foi em <strong className="text-foreground">{formatBRDateTime(data.timestamp, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>{' '}
        (há {hours}h). Os totais só voltam a crescer quando um novo relatório chegar.
      </p>
    </div>
  );
};
