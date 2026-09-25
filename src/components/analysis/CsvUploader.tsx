import { useCallback, useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CsvRow } from '@/hooks/useCryptoAnalysis';

export interface ParsedCsvFile {
  name: string;
  rows: CsvRow[];
}

// Mirrors the server-side caps in the crypto-analysis edge function (rows.length > 5000
// is rejected there). Enforcing it client-side too avoids uploading a payload that's
// certain to bounce, and caps how large a single file we'll read into memory.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_ROWS = 5000;

interface CsvUploaderProps {
  files: ParsedCsvFile[];
  onFilesChange: (files: ParsedCsvFile[]) => void;
  disabled?: boolean;
}

// Parse a CSV text into rows. Columns: A=CRIPTO, B=REPETIÇÃO, C=DATA, D=HORA, E=RANK
function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows: CsvRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const delim = lines[i].includes(';') ? ';' : ',';
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const symbol = (cols[0] || '').toUpperCase();
    // Skip header rows
    if (i === 0 && /cripto|symbol|ativo|moeda/i.test(cols[0] || '')) continue;
    if (!symbol || !/[A-Z0-9]/.test(symbol)) continue;
    const repetition = parseInt((cols[1] || '1').replace(/[^0-9-]/g, ''), 10);
    rows.push({
      symbol,
      repetition: Number.isFinite(repetition) && repetition > 0 ? repetition : 1,
      date: cols[2] || undefined,
      time: cols[3] || undefined,
      rank: cols[4] ? parseInt(cols[4].replace(/[^0-9-]/g, ''), 10) : undefined,
    });
  }
  return rows;
}

export const CsvUploader = ({ files, onFilesChange, disabled }: CsvUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    setError(null);
    const next: ParsedCsvFile[] = [];
    let totalRows = files.reduce((s, f) => s + f.rows.length, 0);
    for (const file of Array.from(fileList)) {
      if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') continue;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" excede o limite de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB por arquivo.`);
        continue;
      }
      const text = await file.text();
      const rows = parseCsv(text);
      if (totalRows + rows.length > MAX_TOTAL_ROWS) {
        setError(`Limite de ${MAX_TOTAL_ROWS} linhas por envio excedido — "${file.name}" não foi adicionado.`);
        continue;
      }
      totalRows += rows.length;
      next.push({ name: file.name, rows });
    }
    onFilesChange([...files, ...next]);
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const removeFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => {
          if (disabled) return;
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.csv,text/csv';
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files;
            if (f) processFiles(f);
          };
          input.click();
        }}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Arraste arquivos <span className="text-primary">.CSV</span> ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Colunas: CRIPTO • REPETIÇÃO • DATA • HORA • RANK
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <motion.div
                key={`${f.name}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.rows.length} linha(s) válidas</p>
                </div>
                <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-secondary/50 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
