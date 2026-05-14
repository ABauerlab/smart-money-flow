import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BrainCircuit, Loader2, Send, Sun, Moon, LogOut, ImagePlus, Globe2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '@/components/analysis/ImageUploader';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { WindowAccordion } from '@/components/analysis/WindowAccordion';
import { useCryptoAnalysis, type Region, type PeriodType } from '@/hooks/useCryptoAnalysis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface UploadedImage { name: string; base64: string; type: string; preview: string; }

const POPULAR_CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

const REGIONS: { value: Region; label: string; subtitle: string; icon: any }[] = [
  { value: 'asia', label: 'Mercado Asiático', subtitle: 'Relatórios da Ásia (A)', icon: Globe2 },
  { value: 'west', label: 'Mercado Ocidental', subtitle: 'Europa + Américas (O)', icon: Building2 },
];

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

const RegionPicker = ({ onPick }: { onPick: (r: Region) => void }) => (
  <div className="container py-10 max-w-3xl">
    <div className="text-center mb-6">
      <h2 className="text-xl font-bold gradient-text mb-1">Escolha a região</h2>
      <p className="text-sm text-muted-foreground">Os relatórios da Ásia e do Ocidente são analisados separadamente.</p>
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {REGIONS.map(r => {
        const Icon = r.icon;
        return (
          <button
            key={r.value}
            onClick={() => onPick(r.value)}
            className="group relative p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <Icon className="w-10 h-10 text-primary mb-3" />
            <h3 className="text-lg font-bold text-foreground">{r.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{r.subtitle}</p>
            <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {r.value === 'asia' ? 'A' : 'O'}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// Build window list per period type
function buildWindows(periodType: PeriodType): { index: number; label: string }[] {
  if (periodType === 'daily') {
    // Today + last 6 days
    const out = [{ index: 0, label: 'Hoje' }];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      out.push({ index: i, label });
    }
    return out;
  }
  if (periodType === 'weekly') {
    return [
      { index: 0, label: 'Semana atual' },
      { index: 1, label: 'Semana anterior' },
      { index: 2, label: 'Semana -2' },
      { index: 3, label: 'Semana -3' },
    ];
  }
  // monthly
  return [
    { index: 0, label: 'Mês atual' },
    { index: 1, label: 'Mês anterior' },
    { index: 2, label: 'Mês -2' },
    { index: 3, label: 'Mês -3' },
  ];
}

const RegionPanel = ({ region, onBack, accessCode, onLogout }: { region: Region; onBack: () => void; accessCode: string; onLogout: () => void }) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedCryptos, setSelectedCryptos] = useState<string[]>([]);
  const [customCrypto, setCustomCrypto] = useState('');
  const [title, setTitle] = useState('');
  const [sessionTime, setSessionTime] = useState<string>(new Date().getHours() < 14 ? 'morning' : 'night');
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('daily');

  const {
    isAnalyzing, submitAnalysis, history, isLoadingHistory,
    deleteAnalyses, isDeleting,
  } = useCryptoAnalysis({ region });

  const windows = useMemo(() => buildWindows(periodType), [periodType]);

  const toggleCrypto = (s: string) => setSelectedCryptos(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addCustomCrypto = () => {
    const v = customCrypto.trim().toUpperCase();
    if (v && !selectedCryptos.includes(v)) { setSelectedCryptos(p => [...p, v]); setCustomCrypto(''); }
  };
  const handleSubmit = async () => {
    if (images.length === 0) return;
    const r = await submitAnalysis(images, selectedCryptos, title, sessionTime);
    if (r) { setCurrentReport(r); setImages([]); }
  };

  const regionLabel = region === 'asia' ? 'Mercado Asiático' : 'Mercado Ocidental';

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
            <h1 className="text-lg font-bold">
              <span className="gradient-text">{regionLabel}</span>
            </h1>
            <p className="text-xs text-muted-foreground">Apenas Lista de Alta (LA) • RA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack} className="h-7 gap-1 text-xs">Trocar região</Button>
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
            <TabsTrigger value="upload">📤 Enviar RA</TabsTrigger>
            <TabsTrigger value="history">📋 Histórico</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Como funciona</p>
              <p>Cadência esperada: <strong>2 envios da Ásia + 2 envios do Ocidente</strong> por dia útil (seg-sex).</p>
              <p>Cada recorte (dia, semana, mês) é <strong>isolado</strong> — não somamos resultados entre semanas nem entre meses.</p>
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

            <WindowAccordion region={region} periodType={periodType} windows={windows} />
          </TabsContent>

          {/* UPLOAD */}
          <TabsContent value="upload" className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Envio de Relatório de Alta (RA)</p>
              <p>Este envio será classificado como <strong>{regionLabel}</strong>. Para enviar para a outra região, troque no topo.</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium flex items-center">
                Período do envio:
                <InfoTooltip text="Manhã = antes das 14h. Noite = após 14h. Ajuda a rastrear padrões entre sessões." />
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSessionTime('morning')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1
                    ${sessionTime === 'morning' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}>
                  <Sun className="w-3 h-3" /> Manhã
                </button>
                <button onClick={() => setSessionTime('night')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1
                    ${sessionTime === 'night' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}>
                  <Moon className="w-3 h-3" /> Noite
                </button>
              </div>
            </div>

            <Input placeholder="Título (opcional — gerado automaticamente)" value={title} onChange={e => setTitle(e.target.value)} className="bg-card border-border/50" />

            <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 space-y-3 shadow-lg shadow-primary/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/20"><ImagePlus className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Imagens da Análise</h3>
                    <p className="text-[11px] text-muted-foreground">Anexe os prints do Relatório de Alta (RA)</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded-md bg-primary/15 text-primary">
                  {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
                </span>
              </div>
              <ImageUploader images={images} onImagesChange={setImages} disabled={isAnalyzing} />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Criptos em foco (opcional — IA detecta automaticamente):</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CRYPTOS.map(c => (
                  <button key={c} onClick={() => toggleCrypto(c)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-colors
                      ${selectedCryptos.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Adicionar outra cripto..." value={customCrypto} onChange={e => setCustomCrypto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCrypto()} className="bg-card border-border/50 text-sm h-8" />
                <Button size="sm" variant="outline" onClick={addCustomCrypto} className="h-8">+</Button>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={images.length === 0 || isAnalyzing} className="w-full gap-2">
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
                : <><Send className="w-4 h-4" /> Enviar RA — {regionLabel} ({images.length} {images.length === 1 ? 'imagem' : 'imagens'})</>}
            </Button>

            {currentReport && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <AnalysisReport
                  title={currentReport.title}
                  summary={currentReport.summary}
                  createdAt={currentReport.created_at}
                  cryptoSymbols={currentReport.crypto_symbols || currentReport.detectedCryptos || []}
                  images={currentReport.images?.map((i: any) => ({ image_url: i.url, image_name: i.name }))}
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
  const [region, setRegion] = useState<Region | null>(() => {
    const r = localStorage.getItem('crypto_region');
    return r === 'asia' || r === 'west' ? r : null;
  });

  if (!accessCode) {
    return <AccessCodeGate onAccess={code => { localStorage.setItem('crypto_access_code', code); setAccessCode(code); }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('crypto_access_code');
    localStorage.removeItem('crypto_region');
    setAccessCode(''); setRegion(null);
  };

  if (!region) {
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
              <p className="text-xs text-muted-foreground">Consolidador CriptoEx</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="h-7 gap-1 text-xs">
            <LogOut className="w-3 h-3" /> Sair
          </Button>
        </motion.header>
        <RegionPicker onPick={r => { localStorage.setItem('crypto_region', r); setRegion(r); }} />
      </div>
    );
  }

  return <RegionPanel region={region} onBack={() => { localStorage.removeItem('crypto_region'); setRegion(null); }} accessCode={accessCode} onLogout={handleLogout} />;
};

export default CryptoAnalysis;
