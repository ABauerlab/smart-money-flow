import { MarketData, GlobalMetrics, Alert } from '@/types/market';

export const mockMarketData: MarketData[] = [
  {
    id: 'usa',
    name: 'S&P 500',
    ticker: 'SPY',
    flag: '🇺🇸',
    currentVolume: 89_420_000,
    averageVolume: 72_150_000,
    price: 5892.45,
    priceChange: 0.85,
    volumeRatio: 1.24,
    zScore: 1.8,
    flowType: 'accumulation',
    convictionScore: 8.2,
    currency: 'USD',
  },
  {
    id: 'crypto',
    name: 'Cripto Global',
    ticker: 'TOTAL',
    flag: '₿',
    currentVolume: 142_800_000_000,
    averageVolume: 98_500_000_000,
    price: 3.42,
    priceChange: 4.25,
    volumeRatio: 1.45,
    zScore: 2.4,
    flowType: 'accumulation',
    convictionScore: 9.1,
    currency: 'USD',
  },
  {
    id: 'brazil',
    name: 'Ibovespa',
    ticker: 'IBOV',
    flag: '🇧🇷',
    currentVolume: 12_450_000_000,
    averageVolume: 15_200_000_000,
    price: 127845,
    priceChange: -1.2,
    volumeRatio: 0.82,
    zScore: -0.9,
    flowType: 'distribution',
    convictionScore: 3.4,
    currency: 'BRL',
  },
];

export const mockGlobalMetrics: GlobalMetrics = {
  riskSentiment: 'risk-on',
  hotMarket: 'Cripto Global',
  dominantFlow: 'inflow',
  verdict: 'Dinheiro institucional migrando fortemente para Cripto e S&P 500. Brasil em modo de saída com volume abaixo da média.',
};

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'divergence',
    severity: 'high',
    message: 'Volume em Cripto 45% acima da média com preço estável indica forte absorção institucional',
    market: 'Cripto Global',
    timestamp: new Date(),
  },
  {
    id: '2',
    type: 'attention',
    severity: 'medium',
    message: 'Volume na B3 em dólares está secando, indicando fuga de capital para mercados desenvolvidos',
    market: 'Ibovespa',
    timestamp: new Date(),
  },
  {
    id: '3',
    type: 'opportunity',
    severity: 'low',
    message: 'S&P 500 mostrando padrão de acumulação clássico com volume crescente em suporte',
    market: 'S&P 500',
    timestamp: new Date(),
  },
];

export const formatVolume = (value: number): string => {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toString();
};

export const formatPrice = (value: number, currency: string): string => {
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const getFlowTypeLabel = (flowType: MarketData['flowType']): string => {
  const labels = {
    accumulation: 'Acumulação',
    distribution: 'Distribuição',
    exhaustion: 'Exaustão',
    neutral: 'Neutro',
  };
  return labels[flowType];
};

export const getFlowTypeDescription = (flowType: MarketData['flowType']): string => {
  const descriptions = {
    accumulation: 'Volume alto + Preço lateral/subindo = Institucional comprando',
    distribution: 'Volume alto + Preço em topo/caindo = Institucional saindo',
    exhaustion: 'Preço subindo + Volume caindo = Falta de combustível',
    neutral: 'Sem padrão identificável de fluxo institucional',
  };
  return descriptions[flowType];
};
