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
import { Seo } from '@/components/Seo';

const AccessCodeGate = ({ onAccess }: { onAccess: (code: string) => void }) => {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-10 md:py-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">

          {/* Commercial copy */}
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <BrainCircuit className="w-3.5 h-3.5" /> Acesso Restrito
              </span>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text leading-tight">Área de Análise</h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Esta é uma área exclusiva para assinantes. Aqui você terá acesso a relatórios
                periódicos, análises baseadas em dados e leituras estruturadas do comportamento do
                mercado de criptomoedas, organizadas com apoio de inteligência artificial.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Nosso conteúdo é desenvolvido com foco em</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Organização de tendências.</li>
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Identificação de padrões de repetição das criptomoedas que mais se valorizam na semana e no mês.</li>
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Consolidação desses dados.</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Tudo isso apresentado de forma clara, objetiva e orientada à tomada de decisão consciente.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Acompanhamentos intrasemanais</h2>
              <p className="text-sm text-muted-foreground">
                Aqui você acompanha o comportamento do mercado de criptomoedas ao longo da semana, com atualizações diárias dos relatórios enviados.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">O que você encontrará aqui</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Relatórios consolidados semanais na sexta-feira e mensais.</li>
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Acompanhamento das criptomoedas na intrasemana.</li>
                <li className="flex gap-2"><span className="text-primary mt-0.5">›</span> Monitoramento de comportamento de alta das criptomoedas.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">⚠️ Aviso importante</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Este ambiente é exclusivamente informativo e educacional. Nenhuma das análises,
                relatórios ou conteúdos disponibilizados constitui recomendação de compra ou venda de
                ativos. As decisões são de responsabilidade do próprio usuário.
              </p>
            </div>
          </div>

          {/* Access + subscribe card */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="lg:sticky lg:top-10 space-y-6">
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-6 space-y-4 text-center">
              <BrainCircuit className="w-10 h-10 text-primary mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-bold gradient-text">Análise IA — CriptoEx</h2>
                <p className="text-xs text-muted-foreground">Digite seu código de acesso pessoal. Mínimo 4 caracteres.</p>
              </div>
              <Input placeholder="Código de acesso..." value={code} onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && code.length >= 4 && onAccess(code)} className="text-center" />
              <Button onClick={() => onAccess(code)} disabled={code.length < 4} className="w-full">Entrar</Button>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3 text-center">
              <h2 className="text-base font-bold text-foreground">Torne-se um assinante</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Para desbloquear o acesso completo e acompanhar todas as análises, torne-se um
                assinante. Entre em contato para acesso à área exclusiva.
              </p>
              <a href="mailto:fluxodosmercados@gmail.com"
                className="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:opacity-90 transition-opacity">
                fluxodosmercados@gmail.com
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
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
          <Link to="/dashboard" aria-label="Voltar ao Dashboard" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
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
              <p>Cadência: <strong>4 relatórios/dia</strong> — 05:00 Londres, 10:30 América, 13:30 América, 21:00 Ásia (consolidados ~15h).</p>
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
                <CalendarDays className="w-3.5 h-3.5" /> Data de fechamento do pregão:
              </label>
              <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                className="bg-card border-border/50 w-full sm:w-56" />
              <p className="text-[11px] text-muted-foreground/70">
                Vale para os 4 relatórios deste pregão (Londres, América e a Ásia da véspera). Todas as linhas entram nesta data — escolha o dia de fechamento (Londres/América).
              </p>
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

  return <>{seo}<AnalysisPanel accessCode={accessCode} onLogout={handleLogout} /></>;
};

export default CryptoAnalysis;
