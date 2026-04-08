import jsPDF from 'jspdf';

interface AnalysisReportData {
  title: string;
  summary: string;
  createdAt: string;
  cryptoSymbols: string[];
}

export function exportAnalysisReportPdf(report: AnalysisReportData) {
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
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(10);
  doc.text('Análise IA de Criptomoedas', margin, 26);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(new Date(report.createdAt).toLocaleString('pt-BR'), margin, 34);

  y = 50;

  // Title
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(report.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  // Crypto symbols
  if (report.cryptoSymbols.length > 0) {
    doc.setTextColor(100, 200, 150);
    doc.setFontSize(9);
    doc.text(`Criptos: ${report.cryptoSymbols.join(', ')}`, margin, y);
    y += 8;
  }

  // Separator
  doc.setDrawColor(40, 40, 60);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Summary content
  const cleanSummary = report.summary
    .replace(/CRYPTOS_DETECTED:.*\n?/i, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/---/g, '')
    .trim();

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const lines = doc.splitTextToSize(cleanSummary, contentWidth);
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 4.5;
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
    doc.text(`Smart Nelson Money • Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, ph - 5);
    doc.text(`Página ${i}/${totalPages}`, pageWidth - margin, ph - 5, { align: 'right' });
  }

  const filename = `analise_${report.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.pdf`;
  doc.save(filename);
}
