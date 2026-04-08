import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  triweekly: 'Trisemanal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
};

export function exportPeriodicReportPdf(report: PeriodicReport) {
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
  doc.text('Smart Nelson Money', margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('Relatório Periódico de Criptomoedas', margin, 26);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  const periodLabel = PERIOD_LABELS[report.period_type] || report.period_type;
  const startDate = new Date(report.period_start).toLocaleDateString('pt-BR');
  const endDate = new Date(report.period_end).toLocaleDateString('pt-BR');
  doc.text(`${periodLabel} • ${startDate} — ${endDate}`, margin, 34);

  y = 50;

  // Rankings table
  if (Array.isArray(report.rankings) && report.rankings.length > 0) {
    doc.setTextColor(14, 165, 233);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Ranking de Repetições', margin, y);
    y += 8;

    const tableData = report.rankings.map((r, i) => [
      `#${i + 1}`,
      r.symbol,
      String(r.total),
      String(r.alta),
      String(r.baixa),
      String(r.volume),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Pos', 'Cripto', 'Total', 'Alta', 'Baixa', 'Volume']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [220, 220, 220],
        fillColor: [15, 18, 28],
        lineColor: [40, 40, 60],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [14, 165, 233],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [20, 24, 38],
      },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // AI Analysis
  if (report.ai_analysis) {
    doc.setTextColor(14, 165, 233);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise IA', margin, y);
    y += 8;

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Strip markdown formatting for PDF
    const cleanText = report.ai_analysis
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/---/g, '');

    const lines = doc.splitTextToSize(cleanText, contentWidth);
    const pageHeight = doc.internal.pageSize.getHeight();

    for (const line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(10, 13, 20);
    doc.rect(0, ph - 12, pageWidth, 12, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text(`Smart Nelson Money • Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, ph - 5);
    doc.text(`Página ${i}/${totalPages}`, pageWidth - margin, ph - 5, { align: 'right' });
  }

  const filename = `relatorio_${report.period_type}_${startDateForFilename(report.period_start)}.pdf`;
  doc.save(filename);
}

function startDateForFilename(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}
