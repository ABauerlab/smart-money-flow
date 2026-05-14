import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCryptoAnalysis, type Region, type PeriodType } from '@/hooks/useCryptoAnalysis';
import { RegionWindowDashboard } from './RegionWindowDashboard';

interface WindowItem { index: number; label: string; }

interface WindowAccordionProps {
  region: Region;
  periodType: PeriodType;
  windows: WindowItem[];
}

const WindowRow = ({ region, periodType, windowIndex, label, defaultOpen }: {
  region: Region; periodType: PeriodType; windowIndex: number; label: string; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const { altaRankings, isLoadingRankings, rankingsWindow, refreshLists, isRefreshingLists } =
    useCryptoAnalysis({ region, periodType, windowIndex });

  return (
    <div className="border border-border/30 rounded-lg bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {open && rankingsWindow && (
            <span className="text-xs text-muted-foreground font-mono">
              {rankingsWindow.start}{rankingsWindow.start !== rankingsWindow.end ? ` → ${rankingsWindow.end}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {open && altaRankings.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              {altaRankings.length} ativos
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0">
              <RegionWindowDashboard
                altaRankings={altaRankings}
                isLoading={isLoadingRankings}
                onRefresh={() => refreshLists(periodType, windowIndex)}
                isRefreshing={isRefreshingLists}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WindowAccordion = ({ region, periodType, windows }: WindowAccordionProps) => {
  return (
    <div className="space-y-2">
      {windows.map((w, idx) => (
        <WindowRow
          key={w.index}
          region={region}
          periodType={periodType}
          windowIndex={w.index}
          label={w.label}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
};
