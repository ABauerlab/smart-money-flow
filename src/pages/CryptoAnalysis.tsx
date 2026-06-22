import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BrainCircuit, Loader2, Send, LogOut, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CsvUploader, type ParsedCsvFile } from '@/components/analysis/CsvUploader';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { WindowAccordion } from '@/components/analysis/WindowAccordion';
import { useCryptoAnalysis, type PeriodType } from '@/hooks/useCryptoAnalysis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AccessCodeGate = ({ onAccess }: { onAccess: (code: string) => void }) => {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-4 text-center">
        <BrainCircuit className="w-12 h-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold gradient-text">Análise IA — CriptoEx</h1>
        <p className="text-sm text-muted-foreground">Digite seu código de acesso pessoal. Mínimo 4 caracteres.</p>
        <Input placeholder="Código de acesso..." value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && code.length >= 4 && onAccess(code)} className="text-center" />
        <Button onClick={() => onAccess(code)} disabled={code.length < 4} className="w-full">Entrar</Button>
      </motion.div>
    </div>
  );
};

const MONTHS_PT = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

// Build window list per period type
function buildWindows(periodType: PeriodType): { index: number; label: string }[] {
  const now = new Date();
  if (periodType === 'daily') {
    const out = [{ index: 0, label: 'Hoje' }];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      out.push({ index: i, label });
    }
    return out;
  }
  if (periodType === 'weekly') {
    const out: { index: number; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const ref = new Date(now); ref.setDate(ref.getDate() - i * 7);
      const dow = ref.getDay() || 7;
      const monday = new Date(ref); monday.setDate(ref.getDate() - (dow - 1));
      const wom = Math.min(4, Math.ceil(monday.getDate() / 7));
      out.push({ index: i, label: `SEMANA ${wom} - ${MONTHS_PT[monday.getMonth()]}` });
    }
    return out;
  }
  // monthly
  const out: { index: number; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ index: i, label: `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

const AnalysisPanel = ({ accessCode, onLogout }: { accessCode: string; onLogout: () => void }) => {
  const [files, setFiles] = useState<ParsedCsvFile[]>([]);
  const [title, setTitle] = useState('');
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');

  const { isAnalyzing, submitCsv, history, isLoadingHistory, deleteAnalyses, isDeleting } = useCryptoAnalysis();

  const windows = useMemo(() => buildWindows(periodType), [periodType]);
  const totalRows = files.reduce((s, f) => s + f.rows.length, 0);

  const handleSubmit = async () => {
    if (files.length === 0) return;
    const rows = files.flatMap(f => f.rows);
    const r = await submitCsv(rows, reportDate, title, files.length);
    if (r) { setCurrentReport(r); setFiles([]); setTitle(''); }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Logo />
          <div>
            <h1 className="text-lg font-bold gradient-text">Análise IA</h1>
            <p className="text-xs text-muted-foreground">Consolidador CriptoEx — mercado geral de cripto</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Código: {accessCode.slice(0, 2)}***</span>
          <Button size="sm" variant="ghost" onClick={onLogout} className="h-7 gap-1 text-xs">
            <LogOut className="w-3 h-3" /> Sair
          </Button>
        </div>
      </motion.header>

      <main className="container py-6 max-w-5xl">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="dashboard">📊 Listas</TabsTrigger>
            <TabsTrigger value="upload">📤 Enviar</TabsTrigger>
            <TabsTrigger value="history">📋 Histórico</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Como funciona</p>
              <p>Cadência: <strong>4 relatórios/dia</strong> — 05:00 Londres, 10:30 América, 13:30 América, 21:00 Ásia (consolidados ~22h).</p>
              <p>A semana vai de <strong>segunda a sexta</strong>; na sexta o somatório fecha e na segunda recomeça do zero.</p>
            </div>

            <div className="flex gap-2">
              {(['daily','weekly','monthly'] as PeriodType[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodType(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border flex-1
                    ${periodType === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}
                >
                  {p === 'daily' ? 'Diária' : p === 'weekly' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>

            <WindowAccordion periodType={periodType} windows={windows} />
          </TabsContent>

          {/* UPLOAD */}
          <TabsContent value="upload" className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Envio de relatórios (.CSV)</p>
              <p>O sistema soma a coluna <strong>REPETIÇÃO</strong> de cada cripto, sem alterar valores. Colunas: CRIPTO, REPETIÇÃO, DATA, HORA, RANK.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Data dos relatórios deste envio:
              </label>
              <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                className="bg-card border-border/50 w-full sm:w-56" />
              <p className="text-[11px] text-muted-foreground/70">Usada quando a coluna DATA do CSV estiver vazia.</p>
            </div>

            <Input placeholder="Título (opcional — gerado automaticamente)" value={title} onChange={e => setTitle(e.target.value)} className="bg-card border-border/50" />

            <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 space-y-3 shadow-lg shadow-primary/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/20"><FileSpreadsheet className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Arquivos CSV</h3>
                    <p className="text-[11px] text-muted-foreground">Anexe um ou mais relatórios .CSV</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded-md bg-primary/15 text-primary">
                  {files.length} arquivo(s) • {totalRows} linha(s)
                </span>
              </div>
              <CsvUploader files={files} onFilesChange={setFiles} disabled={isAnalyzing} />
            </div>

            <Button onClick={handleSubmit} disabled={files.length === 0 || isAnalyzing} className="w-full gap-2">
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                : <><Send className="w-4 h-4" /> Enviar ({totalRows} linha{totalRows === 1 ? '' : 's'})</>}
            </Button>

            {currentReport && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <AnalysisReport
                  title={currentReport.title}
                  summary={currentReport.summary}
                  createdAt={currentReport.created_at}
                  cryptoSymbols={currentReport.crypto_symbols || currentReport.detectedCryptos || []}
                />
              </motion.div>
            )}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history">
            <AnalysisHistory analyses={history} isLoading={isLoadingHistory} onDelete={deleteAnalyses} isDeleting={isDeleting} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const CryptoAnalysis = () => {
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('crypto_access_code') || '');

  const seo = (
    <Seo
      title="Análise IA de Criptomoedas | Fluxo Dos Mercados"
      description="Ferramenta de análise de criptomoedas baseada em IA com relatórios consolidados diários, semanais e mensais do fluxo do mercado geral de cripto."
      path="/analise-ia"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Análise IA de Criptomoedas",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description:
          "Consolidador de relatórios de cripto com análise de IA e somatórios por período.",
      }}
    />
  );

  if (!accessCode) {
    return <>{seo}<AccessCodeGate onAccess={code => { localStorage.setItem('crypto_access_code', code); setAccessCode(code); }} /></>;
  }

  const handleLogout = () => {
    localStorage.removeItem('crypto_access_code');
    setAccessCode('');
  };

  return <AnalysisPanel accessCode={accessCode} onLogout={handleLogout} />;
};

export default CryptoAnalysis;
