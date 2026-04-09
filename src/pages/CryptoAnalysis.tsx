import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BrainCircuit, Loader2, Send, Sun, Moon, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '@/components/analysis/ImageUploader';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { RepetitionDashboard } from '@/components/analysis/RepetitionDashboard';
import { PeriodicReportsView } from '@/components/analysis/PeriodicReportsView';
import { useCryptoAnalysis } from '@/hooks/useCryptoAnalysis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface UploadedImage {
  name: string;
  base64: string;
  type: string;
  preview: string;
}

const REPORT_TYPES = [
  { value: 'alta', label: '📈 Alta', color: 'text-emerald-400' },
  { value: 'baixa', label: '📉 Baixa', color: 'text-red-400' },
  { value: 'volume', label: '📊 Volume', color: 'text-blue-400' },
];

const POPULAR_CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

const AccessCodeGate = ({ onAccess }: { onAccess: (code: string) => void }) => {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-4 text-center"
      >
        <BrainCircuit className="w-12 h-12 text-primary mx-auto" />
        <h1 className="text-xl font-bold gradient-text">Análise IA — CriptoEx</h1>
        <p className="text-sm text-muted-foreground">
          Digite seu código de acesso pessoal para isolar seus dados. Mínimo 4 caracteres.
        </p>
        <Input
          placeholder="Código de acesso..."
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && code.length >= 4 && onAccess(code)}
          className="text-center"
        />
        <Button
          onClick={() => onAccess(code)}
          disabled={code.length < 4}
          className="w-full"
        >
          Entrar
        </Button>
      </motion.div>
    </div>
  );
};

const CryptoAnalysis = () => {
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('crypto_access_code') || '');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedCryptos, setSelectedCryptos] = useState<string[]>([]);
  const [customCrypto, setCustomCrypto] = useState('');
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState<string>('alta');
  const [sessionTime, setSessionTime] = useState<string>(new Date().getHours() < 14 ? 'morning' : 'night');
  const [currentReport, setCurrentReport] = useState<any>(null);

  const {
    isAnalyzing, submitAnalysis, history, isLoadingHistory,
    rankings, isLoadingRankings,
    periodicReports, isLoadingPeriodicReports,
    generatePeriodicReport, isGeneratingReport,
    deleteAnalyses, isDeleting,
  } = useCryptoAnalysis();

  if (!accessCode) {
    return (
      <AccessCodeGate
        onAccess={(code) => {
          localStorage.setItem('crypto_access_code', code);
          setAccessCode(code);
        }}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('crypto_access_code');
    setAccessCode('');
  };

  const toggleCrypto = (symbol: string) => {
    setSelectedCryptos(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const addCustomCrypto = () => {
    if (customCrypto.trim() && !selectedCryptos.includes(customCrypto.toUpperCase())) {
      setSelectedCryptos(prev => [...prev, customCrypto.toUpperCase()]);
      setCustomCrypto('');
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) return;
    const result = await submitAnalysis(images, selectedCryptos, title, reportType, sessionTime);
    if (result) {
      setCurrentReport(result);
      setImages([]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Logo />
          <div>
            <h1 className="text-lg font-bold">
              <span className="gradient-text">Análise IA</span>
              <span className="text-foreground/80 ml-2 hidden sm:inline">CriptoEx</span>
            </h1>
            <p className="text-xs text-muted-foreground">Consolidador de relatórios de criptomoedas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Código: {accessCode.slice(0, 2)}***</span>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="h-7 gap-1 text-xs">
            <LogOut className="w-3 h-3" /> Trocar
          </Button>
        </div>
      </motion.header>

      <main className="container py-6 max-w-5xl">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card/50">
            <TabsTrigger value="upload">📤 Enviar</TabsTrigger>
            <TabsTrigger value="rankings">🏆 Repetições</TabsTrigger>
            <TabsTrigger value="periodic">📊 Periódicos</TabsTrigger>
            <TabsTrigger value="history">📋 Histórico</TabsTrigger>
          </TabsList>

          {/* UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-4">
            {/* Info box */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">📖 Como funciona:</p>
              <p>Envie imagens dos relatórios do robô CriptoEx. Nomeie os arquivos começando com <strong>RA</strong> (Alta) ou <strong>RB</strong> (Baixa), seguido da data e período (ex: <code>RA-09042026-manhã.png</code>).</p>
              <p>A IA identifica automaticamente as criptos, conta repetições e gera rankings. Envie diariamente (manhã e noite) para rastreamento semanal e mensal.</p>
            </div>

            {/* Report Type + Session */}
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1 flex-1">
                <p className="text-xs text-muted-foreground font-medium flex items-center">
                  Tipo do Relatório:
                  <InfoTooltip text="Selecione o tipo de relatório que está enviando. Alta = criptos em tendência de alta. Baixa = criptos em tendência de baixa. Volume = criptos com aumento de volume de negociação." />
                </p>
                <div className="flex gap-2">
                  {REPORT_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      onClick={() => setReportType(rt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                        ${reportType === rt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium flex items-center">
                  Período:
                  <InfoTooltip text="Indica o horário do envio do relatório. Manhã = envio feito antes das 14h. Noite = envio feito após 14h. Isso ajuda a rastrear padrões entre sessões." />
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSessionTime('morning')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1
                      ${sessionTime === 'morning'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}
                  >
                    <Sun className="w-3 h-3" /> Manhã
                  </button>
                  <button
                    onClick={() => setSessionTime('night')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1
                      ${sessionTime === 'night'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card/50 text-muted-foreground border-border/30 hover:border-primary/50'}`}
                  >
                    <Moon className="w-3 h-3" /> Noite
                  </button>
                </div>
              </div>
            </div>

            <Input
              placeholder="Título (opcional — gerado automaticamente: DD/MM/YYYY - Relatório de Alta)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border/50"
            />

            <ImageUploader images={images} onImagesChange={setImages} disabled={isAnalyzing} />

            {/* Crypto selector */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center">
                Criptos em foco (a IA também detecta automaticamente):
                <InfoTooltip text="Selecione criptos que você sabe que estão nos relatórios. A IA também detecta automaticamente as criptos das imagens, então este campo é opcional." />
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CRYPTOS.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCrypto(c)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-colors
                      ${selectedCryptos.includes(c)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar outra cripto..."
                  value={customCrypto}
                  onChange={(e) => setCustomCrypto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomCrypto()}
                  className="bg-card border-border/50 text-sm h-8"
                />
                <Button size="sm" variant="outline" onClick={addCustomCrypto} className="h-8">+</Button>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={images.length === 0 || isAnalyzing}
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar {REPORT_TYPES.find(r => r.value === reportType)?.label} ({images.length} {images.length === 1 ? 'imagem' : 'imagens'})</>
              )}
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

          {/* RANKINGS TAB */}
          <TabsContent value="rankings">
            <RepetitionDashboard rankings={rankings} isLoading={isLoadingRankings} />
          </TabsContent>

          {/* PERIODIC REPORTS TAB */}
          <TabsContent value="periodic">
            <PeriodicReportsView
              reports={periodicReports}
              isLoading={isLoadingPeriodicReports}
              onGenerate={generatePeriodicReport}
              isGenerating={isGeneratingReport}
            />
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <AnalysisHistory
              analyses={history}
              isLoading={isLoadingHistory}
              onDelete={deleteAnalyses}
              isDeleting={isDeleting}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CryptoAnalysis;
