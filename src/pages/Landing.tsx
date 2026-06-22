import { motion } from 'framer-motion';
import { 
  Activity, ArrowRight, BarChart3, Brain, 
  CheckCircle2, Cpu, Globe, LineChart, 
  Newspaper, ShieldCheck, Target, TrendingUp, Zap 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Seo } from '@/components/Seo';

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#000] text-[#D1D1D1] selection:bg-primary/30 overflow-x-hidden font-sans">
      <Seo
        title="Fluxo Dos Mercados | Fluxo Institucional em Tempo Real"
        description="Rastreie o fluxo institucional nos mercados Cripto, EUA (S&P 500) e Bovespa. Identifique liquidez, anomalias de volume e oportunidades de alocação em tempo real."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Fluxo Dos Mercados",
          url: "https://deep-flow-scan.lovable.app/",
          description:
            "Plataforma de análise de fluxo institucional em tempo real para os mercados Cripto, EUA e Bovespa.",
        }}
      />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="container h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 flex-shrink-0">
              <Target className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black tracking-tighter text-white leading-none text-sm sm:text-base truncate">
                FLUXO DOS MERCADOS
              </span>
              <span className="text-[8px] sm:text-[10px] text-primary font-mono tracking-[0.2em]">
                v2.6
              </span>
            </div>
          </Link>

          <Link to="/dashboard">
            <Button 
              className="bg-primary text-black hover:bg-primary/90 text-[10px] sm:text-xs uppercase tracking-widest rounded-none h-9 px-3 sm:px-5 font-bold"
            >
              <span className="hidden sm:inline">Acessar Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
              <ArrowRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/10 blur-[100px] sm:blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-bullish/5 blur-[80px] sm:blur-[120px] rounded-full" />
        </div>

        <div className="container relative z-10 text-center space-y-8 sm:space-y-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary mb-6 sm:mb-8">
              <Activity className="w-3 h-3" />
              Análise de Fluxo Institucional em Tempo Real
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-[88px] font-black tracking-tighter text-white leading-[0.95] uppercase">
              Veja o dinheiro <br className="hidden sm:block" />
              institucional <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40">
                antes do mercado.
              </span>
            </h1>
            
            <p className="mt-6 sm:mt-10 text-base sm:text-xl md:text-2xl text-[#888] max-w-3xl mx-auto font-light leading-relaxed">
              Rastreamos volume, preço e fluxo dos principais ativos do <span className="text-white font-medium">Brasil, EUA, Europa, Ásia e Forex</span> em tempo real. Identifique acumulação, distribuição e exaustão antes que o movimento aconteça.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col items-center gap-6 pt-2"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 bg-primary text-black hover:bg-primary/90 rounded-none font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm group transition-all duration-300 shadow-[0_0_40px_rgba(14,165,233,0.2)]"
                >
                  Abrir o Dashboard
                  <ArrowRight className="ml-3 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/analise-ia" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-none font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm"
                >
                  <Brain className="mr-2 w-4 h-4" />
                  Análise IA
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 opacity-70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-bullish" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Dados em tempo real</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">LGPD Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Mercados Globais</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* O que o sistema oferece */}
      <section className="py-16 sm:py-24 lg:py-32 relative border-t border-white/5">
        <div className="container px-4">
          <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">O que você tem acesso</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4">
              Todas as ferramentas <br />
              <span className="text-primary">para ler o mercado.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: <BarChart3 className="w-6 h-6 text-primary" />,
                title: 'Volume Institucional',
                desc: 'Compare volume atual vs média histórica. Identifique entradas e saídas de capital institucional com Z-Score e ratio de volume.',
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-bullish" />,
                title: 'Fluxo dos Mercados',
                desc: 'Classificação automática em acumulação, distribuição, exaustão ou neutro para cada ativo monitorado.',
              },
              {
                icon: <LineChart className="w-6 h-6 text-warning" />,
                title: 'Mercados Globais',
                desc: 'Ibovespa, S&P 500, Nasdaq, Nikkei, Mercado Europeu, Petrobras, USD/BRL e EUR/BRL — tudo em uma tela.',
              },
              {
                icon: <Brain className="w-6 h-6 text-primary" />,
                title: 'Análise IA de Cripto',
                desc: 'Envie prints de relatórios de alta e baixa. A IA extrai criptomoedas, conta repetições e gera relatórios periódicos.',
              },
              {
                icon: <Newspaper className="w-6 h-6 text-bullish" />,
                title: 'Notícias em Tempo Real',
                desc: 'Feed de notícias dos mercados rastreados, em português, atualizado continuamente via NewsAPI.',
              },
              {
                icon: <Zap className="w-6 h-6 text-warning" />,
                title: 'Alertas Inteligentes',
                desc: 'Notificações automáticas quando volume, preço ou fluxo divergem do padrão histórico.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="p-6 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 inline-block mb-4 group-hover:border-primary/40 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-[#888] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 sm:py-24 relative border-t border-white/5 bg-white/[0.01]">
        <div className="container px-4">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Como funciona</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4">
              Três passos. <br />
              <span className="text-primary">Zero fricção.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { num: '01', title: 'Acesse o Dashboard', desc: 'Sem cadastro, sem cartão. Abra o painel e veja todos os mercados ao vivo.' },
              { num: '02', title: 'Leia o Fluxo', desc: 'Identifique mercados quentes, divergências de volume e oportunidades em segundos.' },
              { num: '03', title: 'Use a IA de Cripto', desc: 'Envie prints, acumule dados e gere relatórios periódicos automáticos.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative p-6 border border-white/10 bg-black/40"
              >
                <span className="text-5xl font-black text-primary/20 font-mono">{step.num}</span>
                <h3 className="text-lg font-bold text-white mt-3 mb-2 uppercase">{step.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-40" />
        
        <div className="container relative z-10 text-center space-y-8 px-4">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
            Pronto para ler <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-bullish">
              o mercado?
            </span>
          </h2>
          
          <p className="text-base sm:text-lg text-[#888] max-w-xl mx-auto">
            Acesso imediato. Sem cadastro. Dados reais.
          </p>

          <Link to="/dashboard" className="inline-block w-full max-w-md">
            <Button 
              size="lg" 
              className="w-full h-16 sm:h-20 bg-white text-black hover:bg-primary rounded-none font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-base sm:text-xl shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-300 group"
            >
              Acessar Agora
              <ArrowRight className="ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs text-[#555] uppercase tracking-widest">
          <span>© 2026 Fluxo Dos Mercados</span>
          <span>
            Desenvolvido por{' '}
            <a 
              href="https://bauerlab.com.br" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline font-bold"
            >
              BauerLab
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
