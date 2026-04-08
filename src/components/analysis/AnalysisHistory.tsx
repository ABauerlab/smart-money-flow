import { AnalysisReport } from './AnalysisReport';
import { History, Loader2 } from 'lucide-react';

interface Analysis {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  crypto_symbols: string[];
  crypto_analysis_images?: { id: string; image_url: string; image_name: string }[];
}

interface AnalysisHistoryProps {
  analyses: Analysis[];
  isLoading: boolean;
}

export const AnalysisHistory = ({ analyses, isLoading }: AnalysisHistoryProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhuma análise anterior encontrada</p>
        <p className="text-xs mt-1">Envie imagens de gráficos para gerar sua primeira análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        Histórico de Análises
      </h2>
      {analyses.map(a => (
        <AnalysisReport
          key={a.id}
          title={a.title}
          summary={a.summary || ''}
          createdAt={a.created_at}
          cryptoSymbols={a.crypto_symbols || []}
          images={a.crypto_analysis_images}
        />
      ))}
    </div>
  );
};
