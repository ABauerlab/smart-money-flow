import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BrainCircuit, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '@/components/analysis/ImageUploader';
import { AnalysisReport } from '@/components/analysis/AnalysisReport';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { useCryptoAnalysis } from '@/hooks/useCryptoAnalysis';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface UploadedImage {
  name: string;
  base64: string;
  type: string;
  preview: string;
}

const POPULAR_CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];

const CryptoAnalysis = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedCryptos, setSelectedCryptos] = useState<string[]>([]);
  const [customCrypto, setCustomCrypto] = useState('');
  const [title, setTitle] = useState('');
  const [currentReport, setCurrentReport] = useState<any>(null);

  const { isAnalyzing, submitAnalysis, history, isLoadingHistory } = useCryptoAnalysis();

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
    const result = await submitAnalysis(images, selectedCryptos, title);
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
              <span className="text-foreground/80 ml-2 hidden sm:inline">Criptomoedas</span>
            </h1>
            <p className="text-xs text-muted-foreground">Análise técnica com inteligência artificial</p>
          </div>
        </div>
        <BrainCircuit className="w-6 h-6 text-primary" />
      </motion.header>

      <main className="container py-6 space-y-8 max-w-4xl">
        {/* Upload Section */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">📊 Envie Gráficos para Análise</h2>
          
          <Input
            placeholder="Título da análise (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card border-border/50"
          />

          <ImageUploader images={images} onImagesChange={setImages} disabled={isAnalyzing} />

          {/* Crypto selector */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Selecione as criptos analisadas:</p>
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gerar Análise ({images.length} {images.length === 1 ? 'imagem' : 'imagens'})
              </>
            )}
          </Button>
        </motion.section>

        {/* Current Report */}
        {currentReport && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-base font-semibold text-foreground mb-4">🧠 Relatório Atual</h2>
            <AnalysisReport
              title={currentReport.title}
              summary={currentReport.summary}
              createdAt={currentReport.created_at}
              cryptoSymbols={currentReport.crypto_symbols || []}
              images={currentReport.images?.map((i: any) => ({ image_url: i.url, image_name: i.name }))}
            />
          </motion.section>
        )}

        {/* History */}
        <AnalysisHistory analyses={history} isLoading={isLoadingHistory} />
      </main>
    </div>
  );
};

export default CryptoAnalysis;
