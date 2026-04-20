import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Loader2, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { exportPeriodicReportPdf } from '@/lib/exportPeriodicReportPdf';
import { InfoTooltip } from '@/components/ui/info-tooltip';

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
  three_days: '3 Dias',
  weekly: '7 Dias',
  biweekly: '15 Dias',
  triweekly: '21 Dias',
  monthly: '30 Dias',
  bimonthly: '60 Dias',
  quarterly: '90 Dias',
  semiannual: '180 Dias',
  annual: '365 Dias',
};

const PERIOD_DESCRIPTIONS: Record<string, string> = {
  three_days: 'Consolida menções dos últimos 3 dias',
  weekly: 'Consolida menções dos últimos 7 dias',
  biweekly: 'Consolida menções dos últimos 15 dias',
  triweekly: 'Consolida menções dos últimos 21 dias',
  monthly: 'Consolida menções dos últimos 30 dias',
  bimonthly: 'Consolida menções dos últimos 60 dias',
  quarterly: 'Consolida menções dos últimos 90 dias',
  semiannual: 'Consolida menções dos últimos 180 dias',
  annual: 'Consolida menções dos últimos 365 dias',
};

const PERIOD_ORDER = ['three_days', 'weekly', 'biweekly', 'monthly', 'triweekly', 'bimonthly', 'quarterly', 'semiannual', 'annual'];

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
      {/* Explainer box */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">📖 O que são Relatórios Periódicos?</p>
        <p>São consolidações dos seus relatórios diários em períodos maiores. A IA analisa os dados acumulados e gera as <strong>Listas de Alta (LA)</strong> e <strong>Listas de Baixa (LB)</strong> separadas.</p>
        <p>O período é calculado a partir da <strong>data atual</strong>. Ex: "3 Dias" cobre os últimos 3 dias, "Semanal" cobre a semana corrente.</p>
        <p>Os dados vêm dos relatórios RA e RB que você já enviou — sem envios, os relatórios ficarão vazios.</p>
      </div>

      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Gerar Relatório Periódico
        <InfoTooltip text="Escolha um período para consolidar as Listas de Alta (LA) e Baixa (LB). A IA analisa as repetições acumuladas e identifica tendências." />
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PERIOD_ORDER.map(type => (
          <Button
            key={type}
            size="sm"
            variant="outline"
            onClick={() => handleGenerate(type)}
            disabled={isGenerating}
            className="text-xs h-auto py-2 px-3 justify-start text-left"
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                {isGenerating && generatingType === type ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                <span className="font-semibold">{PERIOD_LABELS[type]}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-normal">{PERIOD_DESCRIPTIONS[type]}</span>
            </div>
          </Button>
        ))}
      </div>

      {/* Reports list */}
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-6">
        <FileText className="w-4 h-4 text-primary" />
        Relatórios Gerados
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum relatório periódico gerado ainda</p>
          <p className="text-xs mt-1">Clique em um dos períodos acima para gerar</p>
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
                  {Array.isArray(r.rankings) && r.rankings.length > 0 && (
                    <div className="space-y-3">
                      {/* LA */}
                      {r.rankings.some(rank => rank.alta > 0) && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 mb-1">📈 Lista de Alta (LA):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {r.rankings
                              .filter(rank => rank.alta > 0)
                              .sort((a, b) => b.alta - a.alta)
                              .slice(0, 12)
                              .map((rank: RankingEntry, i: number) => (
                                <div key={`alta-${rank.symbol}`} className="flex items-center gap-1 text-xs p-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                                  <span className={i < 3 ? 'text-yellow-500 font-bold' : 'text-muted-foreground'}>#{i + 1}</span>
                                  <span className="font-mono font-semibold">{rank.symbol}</span>
                                  <span className="text-emerald-400 ml-auto">{rank.alta}x</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      {/* LB */}
                      {r.rankings.some(rank => rank.baixa > 0) && (
                        <div>
                          <p className="text-xs font-semibold text-red-400 mb-1">📉 Lista de Baixa (LB):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {r.rankings
                              .filter(rank => rank.baixa > 0)
                              .sort((a, b) => b.baixa - a.baixa)
                              .slice(0, 12)
                              .map((rank: RankingEntry, i: number) => (
                                <div key={`baixa-${rank.symbol}`} className="flex items-center gap-1 text-xs p-1 bg-red-500/10 rounded border border-red-500/20">
                                  <span className={i < 3 ? 'text-yellow-500 font-bold' : 'text-muted-foreground'}>#{i + 1}</span>
                                  <span className="font-mono font-semibold">{rank.symbol}</span>
                                  <span className="text-red-400 ml-auto">{rank.baixa}x</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
