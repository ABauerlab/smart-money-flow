import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCryptoAnalysis, type PeriodType } from '@/hooks/useCryptoAnalysis';
import { RegionWindowDashboard } from './RegionWindowDashboard';

interface WindowItem { index: number; label: string; }

interface WindowAccordionProps {
  periodType: PeriodType;
  windows: WindowItem[];
}

const WindowRow = ({ periodType, windowIndex, label, defaultOpen }: {
  periodType: PeriodType; windowIndex: number; label: string; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const { altaRankings, isLoadingRankings, rankingsWindow, totalMentions, refreshLists, isRefreshingLists } =
    useCryptoAnalysis({ periodType, windowIndex });

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
                totalMentions={totalMentions}
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

export const WindowAccordion = ({ periodType, windows }: WindowAccordionProps) => {
  return (
    <div className="space-y-2">
      {windows.map((w, idx) => (
        <WindowRow
          key={w.index}
          periodType={periodType}
          windowIndex={w.index}
          label={w.label}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
};
