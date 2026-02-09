import { motion, useScroll, useTransform } from 'framer-motion';
import { Target, Zap, Shield, ArrowRight, LayoutDashboard, Eye, BarChart3, Lock, Activity, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#000] text-[#D1D1D1] selection:bg-primary/30 overflow-x-hidden font-sans">
      {/* Fixed Header - Glassmorphism High-End */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 glow-primary">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tighter text-white leading-none">SMART NELSON</span>
              <span className="text-[10px] text-primary font-mono tracking-[0.2em]">TERMINAL v2.6</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-bold text-[#888]">
              <a href="#vision" className="hover:text-white transition-colors">Algoritmo</a>
              <a href="#dashboard" className="hover:text-white transition-colors">Ferramentas</a>
              <a href="#access" className="hover:text-white transition-colors">Acesso</a>
            </nav>
            <Link to="/dashboard">
              <Button variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all duration-500 rounded-none h-9">
                Login Terminal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section: The Matrix Decoding */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background SMC Elements Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <motion.svg 
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Simulated BOS/CHoCH Lines */}
            <motion.path 
              d="M 0 500 L 200 400 L 150 450 L 400 300 L 350 350 L 600 100" 
              fill="none" 
              stroke="hsl(var(--bullish))" 
              strokeWidth="0.5" 
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <rect x="380" y="280" width="120" height="40" fill="hsl(var(--bullish) / 0.05)" stroke="hsl(var(--bullish) / 0.2)" />
            <text x="390" y="305" fill="hsl(var(--bullish))" fontSize="10" fontFamily="monospace">ORDER BLOCK (H4)</text>
          </motion.svg>
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full" />
        </div>

        <motion.div 
          style={{ opacity, scale }}
          className="container relative z-10 text-center space-y-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] uppercase tracking-[0.3em] text-primary mb-8 animate-pulse">
              <Activity className="w-3 h-3" />
              SMC Algorithm Active: 2026 Edition
            </div>
            <h1 className="text-6xl md:text-[120px] font-black tracking-tighter text-white leading-[0.85] uppercase">
              Pare de ser a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">Liquidez.</span>
            </h1>
            <p className="mt-10 text-xl md:text-2xl text-[#888] max-w-3xl mx-auto font-light leading-relaxed">
              O Smart Nelson Money decodifica o rastro institucional em tempo real. <br className="hidden md:block" />
              <span className="text-white font-medium">Identifique BOS, CHoCH e FVG antes do varejo reagir.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10"
          >
            <Link to="/dashboard">
              <Button size="lg" className="h-16 px-12 bg-primary text-black hover:bg-primary/90 rounded-none font-black uppercase tracking-[0.2em] text-sm group transition-all duration-500 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
                Acessar Terminal
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] uppercase tracking-widest text-white font-bold">Status: Online</span>
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Latência: 14ms (Global Sync)</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Fase 1: Visão Computacional (The Algorithm) */}
      <section id="vision" className="py-40 relative border-t border-white/5">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-16">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Visão Computacional <br /><span className="text-primary">SMC Automática</span></h2>
                <p className="text-lg text-[#888] leading-relaxed max-w-xl">
                  Esqueça o desenho manual de zonas. Nossa engine processa o fluxo de ordens e identifica desequilíbrios institucionais com precisão cirúrgica.
                </p>
              </div>

              <div className="grid gap-8">
                {[
                  { 
                    title: 'Institutional Order Blocks', 
                    desc: 'Zonas de oferta e demanda onde o "Dinheiro Grosso" deixou ordens pendentes.',
                    icon: <Shield className="w-6 h-6 text-bullish" />,
                    tag: 'OB'
                  },
                  { 
                    title: 'Fair Value Gaps (FVG)', 
                    desc: 'Detecção instantânea de ineficiências de preço que precisam de rebalanceamento.',
                    icon: <Zap className="w-6 h-6 text-warning" />,
                    tag: 'IMBALANCE'
                  },
                  { 
                    title: 'Liquidity Sweeps & Inducement', 
                    desc: 'Rastreie capturas de liquidez de varejo antes da reversão institucional.',
                    icon: <Crosshair className="w-6 h-6 text-primary" />,
                    tag: 'LIQ'
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    whileInView={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -30 }}
                    transition={{ delay: i * 0.1, duration: 0.8 }}
                    className="glass-card p-8 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                      <span className="text-4xl font-black font-mono">{item.tag}</span>
                    </div>
                    <div className="flex gap-6 relative z-10">
                      <div className="mt-1 p-3 rounded-lg bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">{item.title}</h3>
                        <p className="text-sm text-[#888] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
              <div className="relative aspect-square border border-white/10 bg-black/60 backdrop-blur-xl p-10 flex flex-col justify-between overflow-hidden group">
                {/* Simulated TradingView Terminal Interface */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-bearish" />
                    <span className="text-xs font-mono text-white">BTCUSD / 1H / BINANCE</span>
                  </div>
                  <span className="text-[10px] font-mono text-primary">ALGO: RUNNING</span>
                </div>

                <div className="flex-1 flex items-end gap-2 py-10">
                  {[60, 40, 85, 30, 95, 50, 70, 45, 80, 60, 90, 35].map((h, i) => (
                    <motion.div 
                      key={i}
                      className={`flex-1 ${i === 4 || i === 10 ? 'bg-bullish/60' : 'bg-white/10'}`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ delay: i * 0.05, duration: 1 }}
                    >
                      {(i === 4 || i === 10) && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] font-mono text-bullish whitespace-nowrap">
                          BOS ↑
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="p-6 border border-bullish/30 bg-bullish/5 rounded-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-bullish font-bold uppercase">Smart Money Alert</span>
                    <span className="text-[8px] text-bullish/60">NOW</span>
                  </div>
                  <p className="text-xs font-mono text-white leading-tight">
                    MUDANÇA DE ESTRUTURA (CHoCH) DETECTADA EM ZONA DE DEMANDA H4. <br />
                    <span className="text-bullish">PROBABILIDADE: 94.2%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fase 2: O Dashboard de Elite (TradingView on Steroids) */}
      <section id="dashboard" className="py-40 bg-white/[0.01] border-y border-white/5">
        <div className="container text-center space-y-20">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">O Dashboard de Elite</h2>
            <p className="text-xl text-[#888] font-light">Ferramentas de nível institucional que o TradingView não te mostra por padrão.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-1">
            {[
              {
                icon: <BarChart3 className="w-10 h-10 text-primary" />,
                title: "Heatmaps de Liquidez",
                desc: "Visualize onde as ordens limitadas das baleias estão empilhadas antes do preço chegar lá."
              },
              {
                icon: <Zap className="w-10 h-10 text-warning" />,
                title: "Alertas de MSS/BOS",
                desc: "Notificações instantâneas de Mudança de Estrutura de Mercado em múltiplos timeframes."
              },
              {
                icon: <LayoutDashboard className="w-10 h-10 text-bullish" />,
                title: "Multi-Market Sync",
                desc: "Correlação em tempo real entre S&P500, DXY e Cripto para confirmação de viés institucional."
              }
            ].map((item, i) => (
              <div key={i} className="p-12 space-y-6 border border-white/5 bg-black hover:bg-white/[0.02] transition-all duration-500 group">
                <div className="mb-8 group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fase 3: A Transição (The Gate) */}
      <section id="access" className="py-60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-30" />
        
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="container relative z-10 text-center space-y-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-none bg-white/5 border border-white/10 backdrop-blur-xl"
          >
            <Lock className="w-5 h-5 text-primary" />
            <span className="text-xs font-mono uppercase tracking-[0.4em] text-white">Terminal de Acesso Criptografado</span>
          </motion.div>
          
          <h2 className="text-6xl md:text-[100px] font-black text-white tracking-tighter uppercase leading-none">
            Pronto para <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-bullish">Decodificar?</span>
          </h2>
          
          <div className="max-w-md mx-auto space-y-8">
            <Link to="/dashboard">
              <Button size="lg" className="w-full h-20 bg-white text-black hover:bg-primary hover:text-black rounded-none font-black uppercase tracking-[0.3em] text-xl shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-500 group">
                Entrar no Dashboard
                <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <p className="text-[#555] text-[10px] uppercase tracking-[0.5em] font-bold">
              Acesso restrito • Protocolo 2026 Ativo
            </p>
          </div>
          
          <div className="pt-20 flex flex-col items-center gap-4">
            <div className="w-px h-20 bg-gradient-to-b from-primary to-transparent" />
            <p className="text-[#444] text-[10px] uppercase tracking-[0.6em]">© 2026 Smart Nelson Money Flow • BauerLab</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;