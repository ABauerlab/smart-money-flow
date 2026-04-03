import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisReportProps {
  title: string;
  summary: string;
  createdAt: string;
  cryptoSymbols: string[];
  images?: { image_url: string; image_name: string }[];
}

export const AnalysisReport = ({ title, summary, createdAt, cryptoSymbols, images }: AnalysisReportProps) => {
  // Remove the CRYPTOS_DETECTED line from display
  const cleanSummary = summary.replace(/CRYPTOS_DETECTED:.*\n?/i, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(createdAt).toLocaleString('pt-BR')}
        </div>
      </div>

      {cryptoSymbols.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {cryptoSymbols.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">{s}</span>
          ))}
        </div>
      )}

      {images && images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <img key={i} src={img.image_url} alt={img.image_name} className="h-20 rounded-lg border border-border/30 object-cover" />
          ))}
        </div>
      )}

      <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/80 leading-relaxed">
        <ReactMarkdown>{cleanSummary}</ReactMarkdown>
      </div>
    </motion.div>
  );
};
