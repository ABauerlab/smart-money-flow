import { motion } from 'framer-motion';
import { FileText, Clock, Download, AlertTriangle, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RankingTable } from './RankingTable';

interface AnalysisReportProps {
  title: string;
  summary: string;
  createdAt: string;
  cryptoSymbols: string[];
  images?: { image_url: string; image_name: string }[];
}

// Parse structured data from the AI response
function parseStructuredData(text: string) {
  const sections: {
    type: 'info' | 'alta' | 'baixa' | 'destaques' | 'inconsistencias' | 'text';
    title?: string;
    rows?: { pos: number; cripto: string; repeticoes: number; rank?: string }[];
    items?: string[];
    content?: string;
    meta?: Record<string, string>;
  }[] = [];

  // Extract summary/info section
  const infoMatch = text.match(/###?\s*Resumo\s+do\s+Envio([\s\S]*?)(?=###|$)/i);
  if (infoMatch) {
    const meta: Record<string, string> = {};
    const lines = infoMatch[1].trim().split('\n');
    for (const line of lines) {
      const m = line.match(/^[-*]\s*\*?\*?(.+?)\*?\*?\s*[:：]\s*(.+)/);
      if (m) meta[m[1].trim()] = m[2].trim();
    }
    if (Object.keys(meta).length > 0) {
      sections.push({ type: 'info', meta });
    }
  }

  // Extract table data for Alta
  const altaMatch = text.match(/###?\s*Lista\s+de\s+Alta\s*\(LA\)([\s\S]*?)(?=###|$)/i);
  if (altaMatch) {
    const rows = parseTableRows(altaMatch[1]);
    if (rows.length > 0) {
      sections.push({ type: 'alta', title: 'Lista de Alta (LA)', rows });
    }
  }

  // Extract table data for Baixa
  const baixaMatch = text.match(/###?\s*Lista\s+de\s+Baixa\s*\(LB\)([\s\S]*?)(?=###|$)/i);
  if (baixaMatch) {
    const rows = parseTableRows(baixaMatch[1]);
    if (rows.length > 0) {
      sections.push({ type: 'baixa', title: 'Lista de Baixa (LB)', rows });
    }
  }

  // Extract destaques
  const destaquesMatch = text.match(/###?\s*Destaques([\s\S]*?)(?=###|$)/i);
  if (destaquesMatch) {
    const items = destaquesMatch[1].trim().split('\n')
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
    if (items.length > 0) {
      sections.push({ type: 'destaques', items });
    }
  }

  // Extract inconsistencias
  const inconMatch = text.match(/###?\s*Inconsist[êe]ncias([\s\S]*?)(?=###|$)/i);
  if (inconMatch) {
    const items = inconMatch[1].trim().split('\n')
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 0);
    if (items.length > 0) {
      sections.push({ type: 'inconsistencias', items });
    }
  }

  return sections;
}

function parseTableRows(text: string): { pos: number; cripto: string; repeticoes: number; rank?: string }[] {
  const rows: { pos: number; cripto: string; repeticoes: number; rank?: string }[] = [];
  
  // Try markdown table format: | Pos | Cripto | Repetições | Rank |
  const tableLines = text.split('\n').filter(l => l.includes('|') && !l.match(/^[\s|:-]+$/));
  const dataLines = tableLines.filter(l => !l.match(/Pos|Cripto|Repet/i)); // skip header

  for (const line of dataLines) {
    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length >= 3) {
      const pos = parseInt(cells[0].replace(/[#\s]/g, '')) || rows.length + 1;
      const cripto = cells[1].replace(/\*\*/g, '').trim();
      const repeticoes = parseInt(cells[2]) || 0;
      const rank = cells[3]?.trim() || undefined;
      if (cripto && cripto.length <= 10) {
        rows.push({ pos, cripto, repeticoes, rank });
      }
    }
  }

  // Also try numbered list format: 1. BTC: 5 repetições
  if (rows.length === 0) {
    const listLines = text.split('\n');
    for (const line of listLines) {
      const m = line.match(/(\d+)\.\s*\*?\*?([A-Z0-9]{2,10})\*?\*?\s*[:：-]\s*(\d+)\s*(repeti|aparic|vezes|x)/i);
      if (m) {
        rows.push({
          pos: parseInt(m[1]),
          cripto: m[2].toUpperCase(),
          repeticoes: parseInt(m[3]),
        });
      }
    }
  }

  return rows;
}

function exportReportPdf(title: string, summary: string, createdAt: string, cryptoSymbols: string[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(10, 13, 20);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Fluxo Dos Mercados', margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('Relatório de Análise IA — CriptoEx', margin, 26);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(new Date(createdAt).toLocaleString('pt-BR'), margin, 34);

  y = 50;

  // Title
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 8;

  // Cryptos
  if (cryptoSymbols.length > 0) {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.text(`Criptos: ${cryptoSymbols.join(', ')}`, margin, y);
    y += 8;
  }

  // Try to extract tables for PDF
  const sections = parseStructuredData(summary);
  const altaSection = sections.find(s => s.type === 'alta');
  const baixaSection = sections.find(s => s.type === 'baixa');

  if (altaSection?.rows && altaSection.rows.length > 0) {
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(11);
    doc.text('📈 Lista de Alta (LA)', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Cripto', 'Repetições']],
      body: altaSection.rows.map(r => [String(r.pos), r.cripto, String(r.repeticoes)]),
      styles: { fontSize: 9, cellPadding: 3, textColor: [220, 220, 220], fillColor: [15, 18, 28], lineColor: [40, 40, 60], lineWidth: 0.2 },
      headStyles: { fillColor: [16, 185, 129], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [20, 24, 38] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (baixaSection?.rows && baixaSection.rows.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = margin; }
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(11);
    doc.text('📉 Lista de Baixa (LB)', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Cripto', 'Repetições']],
      body: baixaSection.rows.map(r => [String(r.pos), r.cripto, String(r.repeticoes)]),
      styles: { fontSize: 9, cellPadding: 3, textColor: [220, 220, 220], fillColor: [15, 18, 28], lineColor: [40, 40, 60], lineWidth: 0.2 },
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [20, 24, 38] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Summary text
  const cleanText = summary
    .replace(/CRYPTOS_DETECTED:.*\n?/i, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\|[^|]+\|/g, '')
    .replace(/[-:]+\|/g, '')
    .replace(/---/g, '');

  if (!(altaSection?.rows?.length) && !(baixaSection?.rows?.length)) {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(cleanText, contentWidth);
    const pageHeight = doc.internal.pageSize.getHeight();
    for (const line of lines) {
      if (y > pageHeight - 20) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(10, 13, 20);
    doc.rect(0, ph - 12, pageWidth, 12, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text(`Fluxo Dos Mercados • Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, ph - 5);
    doc.text(`Página ${i}/${totalPages}`, pageWidth - margin, ph - 5, { align: 'right' });
  }

  doc.save(`analise_${new Date(createdAt).toISOString().slice(0, 10)}.pdf`);
}

// Visual table component for crypto rankings
const CryptoRankTable = ({ rows, type }: { rows: { pos: number; cripto: string; repeticoes: number; rank?: string }[]; type: 'alta' | 'baixa' }) => {
  const isAlta = type === 'alta';
  const maxRep = Math.max(...rows.map(r => r.repeticoes), 1);

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      {/* Table header */}
      <div className={`flex items-center gap-2 px-3 py-2 text-xs font-bold ${isAlta ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
        {isAlta ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {isAlta ? 'Lista de Alta (LA)' : 'Lista de Baixa (LB)'}
        <span className="ml-auto text-muted-foreground font-normal">{rows.length} criptos</span>
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-[40px_80px_1fr_60px] gap-1 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-secondary/20">
        <span>Pos</span>
        <span>Cripto</span>
        <span>Barra</span>
        <span className="text-right">Rep.</span>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/20">
        {rows.map((r, i) => (
          <motion.div
            key={r.cripto}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-[40px_80px_1fr_60px] gap-1 px-3 py-2 items-center hover:bg-secondary/10 transition-colors"
          >
            <span className={`text-xs font-bold ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${r.pos}`}
            </span>
            <span className="font-mono text-sm font-bold text-foreground">{r.cripto}</span>
            <div className="h-3 bg-secondary/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(r.repeticoes / maxRep) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.03 }}
                className={`h-full rounded-full ${isAlta ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
              />
            </div>
            <span className={`text-sm font-bold text-right ${isAlta ? 'text-emerald-400' : 'text-red-400'}`}>
              {r.repeticoes}x
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const AnalysisReport = ({ title, summary, createdAt, cryptoSymbols, images }: AnalysisReportProps) => {
  const cleanSummary = summary.replace(/CRYPTOS_DETECTED:.*\n?/i, '').trim();
  const sections = parseStructuredData(summary);

  const altaSection = sections.find(s => s.type === 'alta');
  const baixaSection = sections.find(s => s.type === 'baixa');
  const infoSection = sections.find(s => s.type === 'info');
  const destaquesSection = sections.find(s => s.type === 'destaques');
  const inconSection = sections.find(s => s.type === 'inconsistencias');

  const hasStructuredData = (altaSection?.rows?.length || 0) > 0 || (baixaSection?.rows?.length || 0) > 0;

  // Remove structured sections from markdown to avoid duplication
  let remainingMarkdown = cleanSummary;
  if (hasStructuredData) {
    remainingMarkdown = remainingMarkdown
      .replace(/###?\s*Resumo\s+do\s+Envio[\s\S]*?(?=###|$)/i, '')
      .replace(/###?\s*Lista\s+de\s+Alta\s*\(LA\)[\s\S]*?(?=###|$)/i, '')
      .replace(/###?\s*Lista\s+de\s+Baixa\s*\(LB\)[\s\S]*?(?=###|$)/i, '')
      .replace(/###?\s*Destaques[\s\S]*?(?=###|$)/i, '')
      .replace(/###?\s*Inconsist[êe]ncias[\s\S]*?(?=###|$)/i, '')
      .trim();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card p-4 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportReportPdf(title, summary, createdAt, cryptoSymbols)}
            className="p-1.5 rounded-lg hover:bg-primary/20 transition-colors"
            title="Baixar PDF"
          >
            <Download className="w-4 h-4 text-primary" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(createdAt).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Crypto badges */}
      {cryptoSymbols.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {cryptoSymbols.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">{s}</span>
          ))}
        </div>
      )}

      {/* Images */}
      {images && images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <img key={i} src={img.image_url} alt={img.image_name} className="h-20 rounded-lg border border-border/30 object-cover" />
          ))}
        </div>
      )}

      {/* Structured data view */}
      {hasStructuredData ? (
        <div className="space-y-4">
          {/* Info cards */}
          {infoSection?.meta && Object.keys(infoSection.meta).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(infoSection.meta).map(([key, val]) => (
                <div key={key} className="p-2 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</p>
                  <p className="text-sm font-semibold text-foreground">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tables side by side on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {altaSection?.rows && altaSection.rows.length > 0 && (
              <CryptoRankTable rows={altaSection.rows} type="alta" />
            )}
            {baixaSection?.rows && baixaSection.rows.length > 0 && (
              <CryptoRankTable rows={baixaSection.rows} type="baixa" />
            )}
          </div>

          {/* Destaques */}
          {destaquesSection?.items && destaquesSection.items.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs font-semibold text-yellow-500 flex items-center gap-1.5 mb-2">
                <Star className="w-3.5 h-3.5" /> Destaques
              </p>
              <ul className="space-y-1">
                {destaquesSection.items.map((item, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className="text-yellow-500/60">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inconsistências */}
          {inconSection?.items && inconSection.items.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <p className="text-xs font-semibold text-orange-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Inconsistências
              </p>
              <ul className="space-y-1">
                {inconSection.items.map((item, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className="text-orange-400/60">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Remaining markdown (if any non-structured text) */}
          {remainingMarkdown.length > 20 && (
            <div className="prose prose-sm prose-invert max-w-none text-xs text-foreground/80 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{remainingMarkdown}</ReactMarkdown>
            </div>
          )}
        </div>
      ) : (
        /* Fallback: render full markdown with table support */
        <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/80 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:bg-primary/20 [&_th]:text-primary [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-xs [&_td]:border-t [&_td]:border-border/30 [&_tr:hover]:bg-secondary/10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanSummary}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
};
