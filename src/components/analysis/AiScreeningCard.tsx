import { useState } from 'react';
import { Sparkles, Download, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportPeriodicReportPdf } from '@/lib/exportPeriodicReportPdf';
import { formatBRDateTime } from '@/lib/brTime';
import type { PeriodicReport } from '@/hooks/useCryptoAnalysis';

interface AiScreeningCardProps {
  report: PeriodicReport | undefined;
}

// Renders the 18-step AI screening (ETAPA 18 table + finalists) stored in
// crypto_periodic_reports.ai_analysis. Only the markdown <table> gets its own
// horizontal scroll container — the surrounding prose text still wraps
// normally on narrow screens instead of forcing the whole card to scroll.
export const AiScreeningCard = ({ report }: AiScreeningCardProps) => {
  const [open, setOpen] = useState(false);

  if (!report?.ai_analysis) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-primary/10 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-primary min-w-0">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">Triagem técnica (IA)</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span
            role="button"
            aria-label="Baixar PDF da análise"
            onClick={(e) => { e.stopPropagation(); exportPeriodicReportPdf(report); }}
            className="p-1.5 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="p-3 pt-0 border-t border-primary/10 space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Gerado em {formatBRDateTime(report.created_at)}
          </p>
          <div className="prose prose-sm prose-invert max-w-none text-xs sm:text-sm text-foreground/80 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:bg-primary/20 [&_th]:text-primary [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-1 [&_td]:text-[11px] [&_td]:border-t [&_td]:border-border/30 [&_td]:whitespace-nowrap [&_tr:hover]:bg-secondary/10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto -mx-3 px-3 my-2">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {report.ai_analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
