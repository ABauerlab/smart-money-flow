import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Target, Zap, Shield, ArrowRight, LayoutDashboard, 
  Lock, Activity, Crosshair, CheckCircle2, Users, 
  Cpu, Globe, Sparkles, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#000] text-[#D1D1D1] selection:bg-primary/30 overflow-x-hidden font-sans">
      {/* Fixed Header - Credibilidade & Conformidade */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 glow-primary">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tighter text-white leading-none">SMART NELSON</span>
              <span className="text-[10px] text-primary font-mono tracking-[0.2em]">IA ESTRATÉGICA v2.6</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 px-4 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#888]">
              <ShieldCheck className="w-3 h-3 text-bullish" />
              <span>Conformidade LGPD</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#888]">
              <Cpu className="w-3 h-3 text-primary" />
              <span>IA Responsável</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all duration-500 rounded-none h-9">
                Acesso Imediato
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section: Headline 2026 */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-bullish/5 blur-[120px] rounded-full" />
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] uppercase tracking-[0.3em] text-primary mb-8">
              <Sparkles className="w-3 h-3" />
              Resultados Comprovados & Validados em 2026
            </div>
            <h1 className="text-5xl md:text-[90px] font-black tracking-tighter text-white leading-[0.9] uppercase">
              O futuro do mercado <br />
              é humano: conheça <br />
              nossa <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40">IA Estratégica.</span>
            </h1>
            <p className="mt-10 text-xl md:text-2xl text-[#888] max-w-4xl mx-auto font-light leading-relaxed">
              Sua jornada de <span className="text-white font-medium">alta performance</span> começa com um clique. 
              Simplifique processos complexos e aumente seu ROI com soluções inteligentes personalizadas para você.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-8 pt-6"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/auth">
                <Button size="lg" className="h-16 px-12 bg-primary text-black hover:bg-primary/90 rounded-none font-black uppercase tracking-[0.2em] text-sm group transition-all duration-500 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
                  Garanta sua vaga agora
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-widest text-white font-bold">Comece agora sem riscos</p>
                <p className="text-[10px] uppercase tracking-widest text-[#555]">Acesso exclusivo e imediato</p>
              </div>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bullish" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Verificado por SME</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Segurança Garantida</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-warning" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Global Compliance</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Benefícios Diretos & IA Estratégica */}
      <section id="vision" className="py-40 relative border-t border-white/5">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-16">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
                  Mais que dados, <br />
                  <span className="text-primary">Resultados Reais.</span>
                </h2>
                <p className="text-lg text-[#888] leading-relaxed max-w-xl">
                  Descubra o método que gerou ROI recorde em 2026 através de uma <strong>Experiência Híbrida</strong>: a precisão da IA com a intuição de especialistas no assunto (SME).
                </p>
              </div>

              <div className="grid gap-8">
                {[
                  { 
                    title: 'Simplifique sua Análise', 
                    desc: 'Reduza horas de trabalho manual para segundos com nossos Digital Twins de liquidez.',
                    icon: <Sparkles className="w-6 h-6 text-bullish" />,
                    tag: 'EFICIÊNCIA'
                  },
                  { 
                    title: 'Aumente métricas com IA', 
                    desc: 'Soluções inteligentes que aprendem com seu perfil e personalizam cada insight.',
                    icon: <Cpu className="w-6 h-6 text-warning" />,
                    tag: 'ROI'
                  },
                  { 
                    title: 'Conteúdo Autoral & SME', 
                    desc: 'Validação humana constante por especialistas certificados para garantir IA Responsável.',
                    icon: <Users className="w-6 h-6 text-primary" />,
                    tag: 'CONFIANÇA'
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
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-bullish" />
                    <span className="text-xs font-mono text-white">DIGITAL TWIN ACTIVE</span>
                  </div>
                  <span className="text-[10px] font-mono text-primary">SME VALIDATED</span>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <motion.div 
                      className="absolute inset-0 border-2 border-primary/20 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div 
                      className="absolute inset-4 border border-bullish/30 rounded-full"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-primary/30 bg-primary/5 rounded-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-primary font-bold uppercase">IA Estratégica Insight</span>
                    <span className="text-[8px] text-primary/60">REAL-TIME</span>
                  </div>
                  <p className="text-xs font-mono text-white leading-tight">
                    PROCESSO OTIMIZADO: +42% DE EFICIÊNCIA DETECTADA. <br />
                    <span className="text-bullish">RESULTADO VALIDADO POR SME.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final: Urgência & Benefício */}
      <section id="access" className="py-60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-30" />
        
        <div className="container relative z-10 text-center space-y-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-none bg-white/5 border border-white/10 backdrop-blur-xl"
          >
            <Lock className="w-5 h-5 text-primary" />
            <span className="text-xs font-mono uppercase tracking-[0.4em] text-white">Desbloqueie seu benefício exclusivo</span>
          </motion.div>
          
          <h2 className="text-6xl md:text-[100px] font-black text-white tracking-tighter uppercase leading-none">
            Responda ao seu <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-bullish">Desafio hoje.</span>
          </h2>
          
          <div className="max-w-md mx-auto space-y-8">
            <Link to="/dashboard">
              <Button size="lg" className="w-full h-20 bg-white text-black hover:bg-primary hover:text-black rounded-none font-black uppercase tracking-[0.3em] text-xl shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-500 group">
                Acesso Imediato
                <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <p className="text-[#555] text-[10px] uppercase tracking-[0.5em] font-bold">
              Resultados em tempo recorde • Protocolo 2026 Ativo
            </p>
          </div>
          
          <div className="pt-20 flex flex-col items-center gap-4">
            <div className="w-px h-20 bg-gradient-to-b from-primary to-transparent" />
            <p className="text-[#444] text-[10px] uppercase tracking-[0.6em]">© 2026 Smart Nelson Money Flow • IA Responsável & LGPD Compliant</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;