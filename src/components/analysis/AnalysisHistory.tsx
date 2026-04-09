import { useState } from 'react';
import { AnalysisReport } from './AnalysisReport';
import { History, Loader2, Trash2, CheckSquare, Square, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onDelete?: (ids: string[]) => Promise<void>;
  isDeleting?: boolean;
}

export const AnalysisHistory = ({ analyses, isLoading, onDelete, isDeleting }: AnalysisHistoryProps) => {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map(a => a.id)));
    }
  };

  const handleDelete = async () => {
    if (!onDelete || selectedIds.size === 0) return;
    await onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico de Análises
          <span className="text-xs text-muted-foreground font-normal">({analyses.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs h-7">
                {selectedIds.size === analyses.length ? 'Desmarcar' : 'Selecionar'} Todos
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || isDeleting}
                className="text-xs h-7 gap-1"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Apagar ({selectedIds.size})
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelSelect} className="text-xs h-7">
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} className="text-xs h-7 gap-1">
              <CheckSquare className="w-3 h-3" /> Selecionar
            </Button>
          )}
        </div>
      </div>
      {analyses.map(a => (
        <div key={a.id} className="relative">
          {selectMode && (
            <button
              onClick={() => toggleSelect(a.id)}
              className="absolute top-3 left-3 z-10 p-1 rounded bg-background/80 border border-border/50"
            >
              {selectedIds.has(a.id) ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
          <div className={selectMode && selectedIds.has(a.id) ? 'ring-2 ring-primary/50 rounded-lg' : ''}>
            <AnalysisReport
              title={a.title}
              summary={a.summary || ''}
              createdAt={a.created_at}
              cryptoSymbols={a.crypto_symbols || []}
              images={a.crypto_analysis_images}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
