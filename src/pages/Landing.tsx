import { motion, useScroll, useTransform } from 'framer-motion';
import { Target, Zap, Shield, ArrowRight, LayoutDashboard, Eye, BarChart3, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#000] text-[#D1D1D1] selection:bg-primary/30 overflow-x-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center border border-primary/30">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold tracking-tighter text-white">SMART NELSON</span>
          </div>
          
          <Link to="/dashboard">
            <Button variant="ghost" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">
              Login Sistema
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background SMC Elements Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.svg 
            className="absolute top-1/4 left-1/4 w-full h-full opacity-20"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          >
            <line x1="0" y1="100" x2="400" y2="0" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,5" />
            <rect x="380" y="-20" width="100" height="60" fill="none" stroke="hsl(var(--bullish))" strokeWidth="1" />
          </motion.svg>
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          style={{ opacity, scale }}
          className="container relative z-10 text-center space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.3em] text-primary mb-6">
              Institutional Flow Decoding
            </span>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white leading-[0.9]">
              Pare de ser a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">Liquidez do Mercado.</span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl text-[#888] max-w-2xl mx-auto font-light leading-relaxed">
              O Smart Nelson Money traduz o rastro das instituições em zonas de alta probabilidade. <span className="text-white">Menos ruído, mais precisão.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link to="/dashboard">
              <Button size="lg" className="h-14 px-8 bg-primary text-black hover:bg-primary/90 rounded-none font-bold uppercase tracking-widest group">
                Entrar no Dashboard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-[10px] uppercase tracking-widest text-[#555]">Acesso restrito a terminais autorizados</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Fase 1: Visão Computacional */}
      <section className="py-32 relative">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Visão Computacional</h2>
                <p className="text-[#888] leading-relaxed">Nossa engine processa milhões de ordens por segundo para identificar padrões que o olho humano ignora.</p>
              </div>

              <div className="grid gap-6">
                {[
                  { 
                    title: 'Order Blocks', 
                    desc: 'Identificação automática de pegadas institucionais onde o preço tende a reagir.',
                    icon: <Shield className="w-5 h-5 text-bullish" />
                  },
                  { 
                    title: 'Fair Value Gaps', 
                    desc: 'Detecção de desequilíbrios de liquidez que atuam como imãs para o preço.',
                    icon: <Zap className="w-5 h-5 text-warning" />
                  },
                  { 
                    title: 'Liquidity Sweeps', 
                    desc: 'Rastreamento de capturas de liquidez antes de movimentos explosivos.',
                    icon: <Eye className="w-5 h-5 text-primary" />
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    whileInView={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="flex gap-4">
                      <div className="mt-1">{item.icon}</div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-[#888]">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative aspect-square">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
              <div className="relative h-full border border-white/10 bg-black/40 backdrop-blur-sm p-8 flex flex-col justify-center overflow-hidden">
                {/* Simulated SMC Chart Drawing */}
                <div className="space-y-4">
                  <div className="h-px w-full bg-white/10 relative">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-primary"
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                  <div className="flex justify-between items-end h-40">
                    {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
                      <motion.div 
                        key={i}
                        className={`w-8 ${i % 2 === 0 ? 'bg-bullish/40' : 'bg-bearish/40'}`}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <div className="p-4 border border-bullish/30 bg-bullish/5 rounded text-[10px] font-mono text-bullish">
                    DETECTED: BULLISH ORDER BLOCK (H4)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fase 2: O Dashboard de Elite */}
      <section className="py-32 bg-white/[0.02]">
        <div className="container text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl font-bold text-white">O Dashboard de Elite</h2>
            <p className="text-[#888]">Acesso a ferramentas que antes eram exclusivas de mesas proprietárias e fundos de hedge.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 space-y-4 border border-white/5 bg-black">
              <BarChart3 className="w-8 h-8 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-white">Heatmaps de Liquidez</h3>
              <p className="text-sm text-[#888]">Visualize onde as ordens limitadas estão empilhadas antes do preço chegar lá.</p>
            </div>
            <div className="p-8 space-y-4 border border-white/5 bg-black">
              <Zap className="w-8 h-8 text-warning mx-auto" />
              <h3 className="text-xl font-bold text-white">Alertas de MSS</h3>
              <p className="text-sm text-[#888]">Notificações instantâneas de Mudança de Estrutura de Mercado (Market Structure Shift).</p>
            </div>
            <div className="p-8 space-y-4 border border-white/5 bg-black">
              <LayoutDashboard className="w-8 h-8 text-bullish mx-auto" />
              <h3 className="text-xl font-bold text-white">Multi-Market Sync</h3>
              <p className="text-sm text-[#888]">Correlação em tempo real entre S&P500, DXY e Cripto para confirmação de viés.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fase 3: A Transição */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        <div className="container relative z-10 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono uppercase tracking-widest">Terminal de Acesso Seguro</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter">
            Pronto para decodificar?
          </h2>
          
          <div className="max-w-sm mx-auto">
            <Link to="/dashboard">
              <Button size="lg" className="w-full h-16 bg-white text-black hover:bg-[#D1D1D1] rounded-none font-black uppercase tracking-[0.2em] text-lg shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                Entrar no Dashboard
              </Button>
            </Link>
          </div>
          
          <p className="text-[#555] text-xs uppercase tracking-[0.4em]">© 2025 Smart Nelson Money Flow • BauerLab</p>
        </div>
      </section>
    </div>
  );
};

export default Landing;