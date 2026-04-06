import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, BrainCircuit, Bell, Globe, TrendingUp, Upload, Calendar, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

const sections = [
  {
    icon: <Globe className="w-6 h-6 text-primary" />,
    title: 'Dashboard de Mercados Globais',
    desc: 'Monitore em tempo real 10 mercados globais incluindo S&P 500, NASDAQ, Ibovespa, DAX 40, Nikkei 225, Cripto e mais. Cada card mostra preço, volume, Z-Score e tipo de fluxo institucional.',
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-primary" />,
    title: 'Gráficos de Volume',
    desc: 'Analise o volume institucional em visão diária ou mensal. O volume relativo (%) compara o volume atual com a média histórica. Barras verdes indicam atividade acima da média, vermelhas abaixo.',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: 'Comparação de Mercados',
    desc: 'Compare dois mercados lado a lado para identificar correlações de volume e divergências de fluxo. Útil para detectar rotação de capital entre mercados.',
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-primary" />,
    title: 'Análise IA de Criptomoedas',
    desc: 'Envie imagens de relatórios de alta, baixa e volume. A IA analisa os gráficos, detecta criptos mencionadas e rastreia padrões de repetição ao longo do tempo.',
  },
  {
    icon: <Upload className="w-6 h-6 text-primary" />,
    title: 'Sistema de Relatórios',
    desc: 'Envie relatórios pela manhã e à noite. Cada envio inclui 3 tipos: Alta, Baixa e Volume. O sistema conta quantas vezes cada cripto aparece para gerar rankings.',
  },
  {
    icon: <Calendar className="w-6 h-6 text-primary" />,
    title: 'Relatórios Periódicos',
    desc: 'Relatórios progressivos: semanal, quinzenal, mensal, bimestral, trimestral e semestral. Cada período acumula dados dos anteriores para análise de tendências de longo prazo.',
  },
  {
    icon: <Bell className="w-6 h-6 text-primary" />,
    title: 'Alertas e Notificações',
    desc: 'Receba alertas sonoros e push notifications quando houver movimentação institucional significativa. Ative/desative pelo ícone no cabeçalho do dashboard.',
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: 'Sua Conta',
    desc: 'Seus relatórios e análises são privados. Faça login com email/senha ou Google para acessar seus dados de qualquer dispositivo. Você pode excluir relatórios antigos a qualquer momento.',
  },
];

const Guide = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/dashboard" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Logo />
        <h1 className="text-lg font-bold gradient-text">Guia do Sistema</h1>
      </header>

      <main className="container py-8 max-w-3xl space-y-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao Smart Nelson Money</h2>
          <p className="text-muted-foreground">Tudo que você precisa saber para usar o sistema de forma eficaz</p>
        </div>

        {sections.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-6 flex gap-5"
          >
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 h-fit shrink-0">
              {s.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}

        <div className="text-center pt-6">
          <Link to="/dashboard">
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-lg"
            >
              Ir para o Dashboard →
            </motion.button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Guide;
