import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Loader2, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { exportPeriodicReportPdf } from '@/lib/exportPeriodicReportPdf';

interface RankingEntry {
  symbol: string;
  total: number;
  alta: number;
  baixa: number;
  volume: number;
}

interface PeriodicReport {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  rankings: RankingEntry[];
  summary: string;
  ai_analysis: string;
  created_at: string;
}

interface PeriodicReportsViewProps {
  reports: PeriodicReport[];
  isLoading: boolean;
  onGenerate: (periodType: string) => Promise<any>;
  isGenerating: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
  weekly: '📅 Semanal',
  biweekly: '📊 Quinzenal',
  triweekly: '📈 Trisemanal',
  monthly: '🗓️ Mensal',
  bimonthly: '📆 Bimestral',
  quarterly: '📋 Trimestral',
  semiannual: '📑 Semestral',
};

const PERIOD_ORDER = ['weekly', 'biweekly', 'triweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual'];

export const PeriodicReportsView = ({ reports, isLoading, onGenerate, isGenerating }: PeriodicReportsViewProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  const handleGenerate = async (type: string) => {
    setGeneratingType(type);
    await onGenerate(type);
    setGeneratingType(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Relatórios Periódicos
      </h3>

      {/* Generate buttons */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_ORDER.map(type => (
          <Button
            key={type}
            size="sm"
            variant="outline"
            onClick={() => handleGenerate(type)}
            disabled={isGenerating}
            className="text-xs h-7"
          >
            {isGenerating && generatingType === type ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : null}
            {PERIOD_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Reports list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Nenhum relatório periódico gerado ainda
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-border/30 rounded-lg bg-card/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{PERIOD_LABELS[r.period_type] || r.period_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.period_start).toLocaleDateString('pt-BR')} — {new Date(r.period_end).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); exportPeriodicReportPdf(r); }}
                    className="p-1 rounded hover:bg-primary/20 transition-colors"
                    title="Baixar PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedId === r.id && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Rankings */}
                  {Array.isArray(r.rankings) && r.rankings.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Top Criptos:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {r.rankings.slice(0, 12).map((rank: RankingEntry, i: number) => (
                          <div key={rank.symbol} className="flex items-center gap-1 text-xs p-1 bg-secondary/20 rounded">
                            <span className={i < 3 ? 'text-yellow-500 font-bold' : 'text-muted-foreground'}>#{i + 1}</span>
                            <span className="font-mono font-semibold">{rank.symbol}</span>
                            <span className="text-muted-foreground ml-auto">{rank.total}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {r.ai_analysis && (
                    <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed">
                      <ReactMarkdown>{r.ai_analysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
