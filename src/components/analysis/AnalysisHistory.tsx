import { useState } from 'react';
import { AnalysisReport } from './AnalysisReport';
import { History, Loader2, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
}

export const AnalysisHistory = ({ analyses, isLoading, onDelete }: AnalysisHistoryProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map(a => a.id)));
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowConfirm(false);
    setIsDeleting(false);
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
        </h2>
        {onDelete && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll} className="gap-1 text-xs">
              {selectedIds.size === analyses.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {selectedIds.size === analyses.length ? 'Desmarcar' : 'Selecionar tudo'}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="gap-1 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir ({selectedIds.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {analyses.map(a => (
        <div key={a.id} className="relative">
          {onDelete && (
            <button
              onClick={() => toggleSelect(a.id)}
              className={`absolute top-4 right-4 z-10 p-1.5 rounded-md transition-colors ${
                selectedIds.has(a.id)
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {selectedIds.has(a.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          )}
          <div className={`transition-all ${selectedIds.has(a.id) ? 'ring-2 ring-destructive/50 rounded-lg' : ''}`}>
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

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} relatório{selectedIds.size > 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
