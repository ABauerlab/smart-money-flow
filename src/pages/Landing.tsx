import { motion } from 'framer-motion';
import {
  Activity, ArrowRight, BarChart3, Network,
  CheckCircle2, Globe, LineChart,
  Newspaper, ShieldCheck, Target, TrendingUp, Zap, UserX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Seo } from '@/components/Seo';
import produtoDesktop from '@/assets/landing/produto-criptoex-ia.png';
import produtoMobile from '@/assets/landing/produto-criptoex-ia-mobile.png';
import produtoDashboard from '@/assets/landing/produto-dashboard.png';
import produtoOperacao from '@/assets/landing/produto-operacao.png';
import produtoGlossario from '@/assets/landing/produto-glossario.png';
import produtoEnviar from '@/assets/landing/produto-enviar.png';
import produtoHistorico from '@/assets/landing/produto-historico.png';

const MORE_SCREENS = [
  { img: produtoDashboard, title: 'Dashboard', desc: 'Veredito do fluxo e todos os mercados globais numa tela só.' },
  { img: produtoOperacao, title: 'Operação (CriptoEx)', desc: 'Ranking ao vivo da rodada mais recente, com variação por ativo.' },
  { img: produtoGlossario, title: 'Glossário', desc: 'Cada termo técnico explicado, sem academiquês.' },
  { img: produtoEnviar, title: 'Enviar relatório', desc: 'Suba o CSV e o sistema soma e organiza sozinho.' },
  { img: produtoHistorico, title: 'Histórico', desc: 'Todos os envios anteriores, sempre à mão.' },
];

const TICKER_ITEMS = [
  'IBOVESPA', 'S&P 500', 'NASDAQ', 'NIKKEI 225', 'MERCADO EUROPEU',
  'BITCOIN', 'ETHEREUM', 'USD/BRL', 'EUR/BRL',
];

const PAIN_POINTS = [
  'Grupo de Telegram manda "entrada confirmada" e some quando dá errado.',
  'Influenciador mostra o print do lucro, nunca o da perda.',
  'Você decide sem saber se é dinheiro institucional entrando ou só hype de varejo.',
  'Quando o sinal chega até você, o movimento institucional já aconteceu.',
];

const BENEFITS = [
  {
    icon: BarChart3,
    color: 'text-primary',
    title: 'Volume Institucional',
    desc: 'Compare volume atual vs média histórica. Identifique entradas e saídas de capital com Z-Score e ratio de volume.',
    span: 'sm:col-span-2',
  },
  {
    icon: TrendingUp,
    color: 'text-bullish',
    title: 'Fluxo dos Mercados',
    desc: 'Classificação automática em acumulação, distribuição, exaustão ou neutro para cada ativo monitorado.',
    span: '',
  },
  {
    icon: LineChart,
    color: 'text-warning',
    title: 'Mercados Globais',
    desc: 'Ibovespa, S&P 500, Nasdaq, Nikkei, Mercado Europeu, Petrobras, USD/BRL e EUR/BRL, tudo em uma tela.',
    span: '',
  },
  {
    icon: Network,
    color: 'text-primary',
    title: 'Observatório CriptoEx',
    desc: 'Envie relatórios de recorrência e deixe a triagem técnica de IA rodar sozinha, com rankings diários, semanais e mensais.',
    span: 'sm:col-span-2',
  },
  {
    icon: Newspaper,
    color: 'text-bullish',
    title: 'Notícias em Tempo Real',
    desc: 'Feed de notícias dos mercados rastreados, em português, atualizado continuamente.',
    span: '',
  },
  {
    icon: Zap,
    color: 'text-warning',
    title: 'Alertas Inteligentes',
    desc: 'Notificações automáticas quando volume, preço ou fluxo divergem do padrão histórico.',
    span: '',
  },
];

const STEPS = [
  { num: '01', title: 'Acesse o Dashboard', desc: 'Sem cadastro, sem cartão. Abra o painel e veja todos os mercados ao vivo.' },
  { num: '02', title: 'Leia o Fluxo', desc: 'Veja em segundos onde está o volume, o Z-Score e o veredito do dia.' },
  { num: '03', title: 'Use a IA de Cripto', desc: 'Envie seus relatórios e deixe a triagem técnica trabalhar por você.' },
];

const FAQ_ITEMS = [
  {
    q: 'Isso é sinal de compra ou venda?',
    a: 'Não. O Fluxo Dos Mercados mostra dado objetivo (volume, Z-Score, classificação de fluxo), não recomendação de compra ou venda. A decisão continua sendo sua.',
  },
  {
    q: 'Preciso pagar ou criar conta?',
    a: 'Não. O dashboard principal é de acesso livre, sem cadastro. O módulo de Análise IA usa um código de acesso pessoal, sem custo.',
  },
  {
    q: 'Preciso ter conta em alguma corretora?',
    a: 'Não. O Fluxo Dos Mercados só mostra dados de mercado. Você continua usando a corretora que já tem, se decidir operar.',
  },
  {
    q: 'De onde vêm os dados?',
    a: 'De fontes públicas de mercado (como a Binance, para cripto) e da recorrência consolidada nos relatórios enviados pelos próprios usuários do módulo CriptoEx.',
  },
  {
    q: 'Funciona para qualquer mercado?',
    a: 'Hoje cobrimos Ibovespa, S&P 500, Nasdaq, Nikkei, mercado europeu, Forex (USD/BRL e EUR/BRL) e os principais criptoativos.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground/90 selection:bg-primary/30 overflow-x-hidden font-sans">
      <Seo
        title="Fluxo Dos Mercados | Fluxo Institucional em Tempo Real"
        description="Pare de seguir call de grupo. Veja volume, Z-Score e fluxo institucional real de Cripto, EUA, Bovespa e mais, grátis e sem cadastro."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Fluxo Dos Mercados',
            url: 'https://deep-flow-scan.lovable.app/',
            description:
              'Plataforma de análise de fluxo institucional em tempo real para os mercados Cripto, EUA e Bovespa.',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Fluxo Dos Mercados',
            url: 'https://deep-flow-scan.lovable.app/',
            logo: 'https://deep-flow-scan.lovable.app/logo.svg',
            email: 'fluxodosmercados@gmail.com',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ]}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
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
              className="bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-transform text-[10px] sm:text-xs uppercase tracking-widest rounded-none h-9 px-3 sm:px-5 font-bold"
            >
              <span className="hidden sm:inline">Acessar Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
              <ArrowRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* 1. Hero */}
        <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-10 sm:pt-32 sm:pb-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/10 blur-[100px] sm:blur-[150px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-bullish/5 blur-[80px] sm:blur-[120px] rounded-full" />
          </div>
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="hidden xl:block absolute right-[4%] top-[18%] w-[280px] pointer-events-none select-none"
          >
            <div className="rounded-xl border border-primary/20 bg-background/60 backdrop-blur shadow-[0_0_80px_rgba(14,165,233,0.15)] overflow-hidden">
              <img src={produtoDashboard} alt="" aria-hidden="true" className="w-full opacity-90" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 5 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="hidden xl:block absolute left-[4%] bottom-[12%] w-[240px] pointer-events-none select-none"
          >
            <div className="rounded-xl border border-bullish/20 bg-background/60 backdrop-blur shadow-[0_0_80px_rgba(16,185,129,0.12)] overflow-hidden">
              <img src={produtoOperacao} alt="" aria-hidden="true" className="w-full opacity-80" />
            </div>
          </motion.div>

          <div className="container relative z-10 text-center space-y-8 sm:space-y-10 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary mb-6 sm:mb-8">
                <Activity className="w-3 h-3" />
                Dado institucional, não palpite de grupo
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-white leading-[0.95] uppercase">
                O dinheiro institucional <br className="hidden sm:block" />
                não manda call. <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40">
                  ele deixa rastro.
                </span>
              </h1>

              <p className="mt-6 sm:mt-10 text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
                Enquanto grupo de sinal manda opinião, o Fluxo Dos Mercados mostra o dado bruto:
                volume, Z-Score e fluxo real dos principais mercados do mundo, em tempo real e de graça.
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
                    className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 bg-primary text-black hover:bg-primary/90 hover:scale-105 rounded-none font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm group transition-all duration-300 shadow-[0_0_40px_rgba(14,165,233,0.2)] animate-pulse"
                  >
                    Abrir o Dashboard
                    <ArrowRight className="ml-3 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/analise-ia" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 rounded-none font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm"
                  >
                    <Network className="mr-2 w-4 h-4" />
                    Testar a Análise IA
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 opacity-70">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-bullish" />
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Dados em tempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Sem cadastro</span>
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

        {/* 2. Ticker de mercados cobertos */}
        <section className="relative border-y border-white/5 bg-white/[0.02] py-4 overflow-hidden" aria-label="Mercados monitorados em tempo real">
          <p className="sr-only">Mercados monitorados em tempo real: {TICKER_ITEMS.join(', ')}.</p>
          <div className="flex w-max animate-marquee" aria-hidden="true">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-3 px-6 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70 whitespace-nowrap"
              >
                {item}
                <span className="w-1 h-1 rounded-full bg-primary/40" />
              </span>
            ))}
          </div>
        </section>

        {/* 3. Agitação da dor */}
        <section className="relative py-16 sm:py-24 border-t border-white/5 overflow-hidden">
          <div className="absolute top-0 right-[10%] w-[250px] h-[250px] bg-bearish/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="container relative px-4 max-w-3xl mx-auto text-center">
            <motion.div {...fadeUp}>
              <span className="text-[10px] uppercase tracking-[0.3em] text-bearish font-bold">O problema</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4 mb-10">
                Call de grupo é opinião. <br />
                <span className="text-primary">Você precisa de dado.</span>
              </h2>
            </motion.div>
            <ul className="space-y-4 text-left max-w-xl mx-auto">
              {PAIN_POINTS.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-bearish shrink-0" />
                  {point}
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Solução / mecanismo único */}
        <section className="relative py-16 sm:py-24 border-t border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="absolute bottom-0 left-[8%] w-[280px] h-[280px] bg-primary/5 blur-[110px] rounded-full pointer-events-none" />
          <div className="container relative px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <motion.div {...fadeUp}>
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">O mecanismo</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4 mb-6">
                  Não é opinião. <br />
                  <span className="text-primary">É volume, Z-Score e fluxo, direto da fonte.</span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  A cada atualização, o sistema calcula se o volume de cada ativo está acima ou abaixo
                  do padrão histórico e classifica automaticamente o momento em acumulação, distribuição,
                  exaustão ou neutro. Sem call. Sem viés. Só o dado.
                </p>
              </motion.div>
            </div>

            <motion.div
              {...fadeUp}
              className="max-w-sm mx-auto rounded-xl border border-white/10 bg-background/60 backdrop-blur p-5 shadow-[0_0_60px_rgba(14,165,233,0.08)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wide">BTC/USDT</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bullish/15 text-bullish font-bold uppercase">Acumulação</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Z-Score</p>
                  <p className="text-xl font-black text-bullish font-mono">+2,41</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Vol. relativo</p>
                  <p className="text-xl font-black text-white font-mono">184%</p>
                </div>
              </div>
              <div className="mt-4 h-10 flex items-end gap-1">
                {[40, 55, 48, 62, 58, 71, 66, 82, 77, 94, 88, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-primary/70 to-primary/20 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* 5. Benefícios: bento no desktop, carrossel com snap no mobile */}
        <section className="py-16 sm:py-24 lg:py-32 border-t border-white/5">
          <div className="container px-4">
            <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">O que você tem acesso</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4">
                Todas as ferramentas <br />
                <span className="text-primary">para ler o mercado.</span>
              </h2>
            </div>

            {/* Mobile: horizontal snap carousel, peek of next card at the edge */}
            <div className="sm:hidden -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
              {BENEFITS.map((item, i) => (
                <div
                  key={i}
                  className="snap-start shrink-0 w-[78vw] p-6 border border-white/5 bg-white/[0.02] active:bg-white/[0.04] active:border-primary/30 transition-all duration-300"
                >
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 inline-block mb-4">
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 uppercase tracking-tight">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Desktop: bento grid (assimétrico, alguns cards ocupam 2 colunas) */}
            <div className="hidden sm:grid sm:grid-cols-4 gap-4 sm:gap-6">
              {BENEFITS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className={`relative overflow-hidden p-6 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all duration-300 group ${item.color} ${item.span}`}
                >
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-current opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity" />
                  <div className="relative p-2.5 rounded-lg bg-white/5 border border-white/10 inline-block mb-4 group-hover:border-primary/40 transition-colors">
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 uppercase tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Produto em ação (prova real, sem depoimento fabricado) */}
        <section className="py-16 sm:py-24 border-t border-white/5 bg-white/[0.01]">
          <div className="container px-4">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Sem enfeite, é a tela real</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4">
                O produto rodando, <br />
                <span className="text-primary">não um protótipo.</span>
              </h2>
            </div>

            <div className="max-w-5xl mx-auto space-y-16 sm:space-y-24">
              <motion.article
                {...fadeUp}
                className="grid md:grid-cols-2 gap-6 md:gap-10 items-center"
              >
                <img
                  src={produtoDesktop}
                  alt="Tela do Observatório CriptoEx mostrando o ranking de criptoativos e a triagem técnica de IA gerada automaticamente"
                  width={1280}
                  height={955}
                  loading="lazy"
                  className="w-full rounded-lg border border-white/10 shadow-2xl"
                />
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight mb-3">
                    Triagem técnica automática
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    A cada envio, uma triagem de IA roda sozinha sobre os ativos mais recorrentes,
                    com tabela comparativa, pontuação e os finalistas explicados ponto a ponto.
                    Você só lê o resultado.
                  </p>
                </div>
              </motion.article>

              <motion.article
                {...fadeUp}
                className="grid md:grid-cols-2 gap-6 md:gap-10 items-center"
              >
                <div className="order-2 md:order-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight mb-3">
                    Funciona igual no celular
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Sem app para baixar. Abre direto no navegador do celular, com a mesma
                    profundidade de dado da versão de computador.
                  </p>
                </div>
                <img
                  src={produtoMobile}
                  alt="Tela do Observatório CriptoEx aberta no celular, mostrando a triagem técnica de IA em formato responsivo"
                  width={390}
                  height={1118}
                  loading="lazy"
                  className="order-1 md:order-2 w-full max-w-[280px] mx-auto rounded-lg border border-white/10 shadow-2xl"
                />
              </motion.article>
            </div>

            {/* Galeria: o resto do sistema, mesma lógica de carrossel com snap no mobile */}
            <motion.p
              {...fadeUp}
              className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mt-16 mb-6"
            >
              E tem mais telas rodando por trás
            </motion.p>
            {/* Mobile: horizontal snap carousel */}
            <div className="sm:hidden -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
              {MORE_SCREENS.map((screen, i) => (
                <figure
                  key={i}
                  className="snap-start shrink-0 w-[70vw] border border-white/10 bg-white/[0.02] rounded-lg overflow-hidden"
                >
                  <img
                    src={screen.img}
                    alt={`Tela real de ${screen.title} do Fluxo Dos Mercados`}
                    width={1440}
                    height={900}
                    loading="lazy"
                    className="w-full aspect-[16/10] object-cover object-top"
                  />
                  <figcaption className="p-3">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{screen.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{screen.desc}</p>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Desktop/tablet: full grid, bigger previews */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">
              {MORE_SCREENS.map((screen, i) => (
                <motion.figure
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="border border-white/10 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] rounded-lg overflow-hidden transition-all duration-300"
                >
                  <img
                    src={screen.img}
                    alt={`Tela real de ${screen.title} do Fluxo Dos Mercados`}
                    width={1440}
                    height={900}
                    loading="lazy"
                    className="w-full aspect-[16/10] object-cover object-top"
                  />
                  <figcaption className="p-3">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{screen.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{screen.desc}</p>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Como funciona */}
        <section className="relative py-16 sm:py-24 border-t border-white/5 overflow-hidden">
          <div className="absolute top-10 right-[15%] w-[220px] h-[220px] bg-warning/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="container relative px-4">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Como funciona</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mt-4">
                Três passos. <br />
                <span className="text-primary">Zero fricção.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="relative p-6 border border-white/10 bg-background/40"
                >
                  <span className="text-5xl font-black text-primary/20 font-mono">{step.num}</span>
                  <h3 className="text-lg font-bold text-white mt-3 mb-2 uppercase">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section className="relative py-16 sm:py-24 border-t border-white/5 bg-white/[0.01] overflow-hidden">
          <div className="absolute bottom-0 left-[20%] w-[240px] h-[240px] bg-primary/5 blur-[110px] rounded-full pointer-events-none" />
          <div className="container relative px-4 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Dúvidas frequentes</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mt-4">
                Antes de perguntar no grupo
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left text-sm sm:text-base font-bold text-white hover:text-primary hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* 9. CTA Final */}
        <section className="py-20 sm:py-32 relative overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-40" />

          <div className="container relative z-10 text-center space-y-8 px-4">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              Pare de adivinhar. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-bullish">
                Comece a ler o fluxo.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Acesso imediato. Sem cadastro. Dados reais.
            </p>

            <Link to="/dashboard" className="inline-block w-full max-w-md">
              <Button
                size="lg"
                className="w-full h-16 sm:h-20 bg-white text-black hover:bg-primary hover:scale-105 rounded-none font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-base sm:text-xl shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-300 group"
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
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest">
          <span>© 2026 Fluxo Dos Mercados</span>
          <a href="mailto:fluxodosmercados@gmail.com" className="hover:text-primary hover:underline normal-case tracking-normal">
            fluxodosmercados@gmail.com
          </a>
          <span className="normal-case tracking-normal text-[10px] opacity-50 hover:opacity-100 transition-opacity duration-300">
            Desenvolvido por{' '}
            <a
              href="https://bauerlab.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold"
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
