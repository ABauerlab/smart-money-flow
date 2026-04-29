import { GlossaryEntry } from '@/types/glossary';

export const glossaryData: GlossaryEntry[] = [
  {
    term: 'Volume Relativo (Volume Ratio)',
    definition: 'A razão entre o volume atual de negociação e o volume médio histórico (geralmente 20 dias). Um valor acima de 1.2x indica atividade institucional significativa (Fluxo dos Mercados).',
    example: 'Volume Relativo de 1.5x significa que o volume de hoje é 50% maior que a média.',
  },
  {
    term: 'Z-Score',
    definition: 'Medida estatística que indica quantos desvios-padrão o volume atual está acima ou abaixo da média. Valores acima de +1.5σ ou abaixo de -1.5σ são considerados extremos.',
    example: 'Um Z-Score de +2.0σ sugere que o volume é excepcionalmente alto.',
  },
  {
    term: 'Fluxo: Acumulação',
    definition: 'Padrão onde o volume é alto (Volume Ratio > 1.2) enquanto o preço se mantém estável ou sobe ligeiramente. Indica que grandes players estão comprando sem elevar drasticamente o preço.',
  },
  {
    term: 'Fluxo: Distribuição',
    definition: 'Padrão onde o volume é alto (Volume Ratio > 1.2) enquanto o preço está em topo ou caindo. Indica que grandes players estão vendendo (distribuindo) suas posições.',
  },
  {
    term: 'Fluxo: Exaustão',
    definition: 'Padrão onde o preço continua subindo, mas o volume está caindo (Volume Ratio < 0.7). Sugere que o movimento de alta está perdendo força (falta de combustível).',
  },
  {
    term: 'Convicção Institucional (Conviction Score)',
    definition: 'Um score proprietário (0-10) que combina Volume Relativo, Z-Score e Tipo de Fluxo para quantificar a força e a direção da atividade do Fluxo dos Mercados em um mercado.',
  },
  {
    term: 'Risk-On / Risk-Off',
    definition: 'Sentimento global de risco. Risk-On: capital migra para ativos mais arriscados (ex: Cripto, Ações de Crescimento). Risk-Off: capital migra para ativos mais seguros (ex: Dólar, Títulos).',
  },
  {
    term: 'Dinheiro Grosso (Fluxo dos Mercados)',
    definition: 'Termo usado para descrever o capital investido por grandes instituições, fundos de hedge e bancos. O Fluxo Dos Mercados rastreia a atividade desses participantes.',
  },
];
