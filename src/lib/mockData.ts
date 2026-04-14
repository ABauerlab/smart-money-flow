import { MarketData, GlobalMetrics, Alert } from '@/types/market';

export const mockMarketData: MarketData[] = [
  {
    id: 'usa',
    name: 'S&P 500',
    ticker: 'SPY',
    flag: '🇺🇸',
    category: 'indices',
    currentVolume: 89420000,
    averageVolume: 72150000,
    price: 5892.45,
    priceChange: 0.85,
    volumeRatio: 1.24,
    zScore: 1.8,
    flowType: 'accumulation',
    convictionScore: 8.2,
    currency: 'USD',
    monthlyVolumes: [
      { month: 'Jan', volume: 75000000, average: 72000000 },
      { month: 'Fev', volume: 82000000, average: 72000000 },
      { month: 'Mar', volume: 89420000, average: 72000000 },
    ]
  },
  {
    id: 'nyse',
    name: 'NYSE Composite',
    ticker: 'NYA',
    flag: '🏛️',
    category: 'stocks',
    currentVolume: 3450000000,
    averageVolume: 3100000000,
    price: 18450.20,
    priceChange: 0.45,
    volumeRatio: 1.11,
    zScore: 0.9,
    flowType: 'neutral',
    convictionScore: 6.5,
    currency: 'USD',
  },
  {
    id: 'brazil',
    name: 'Ibovespa',
    ticker: 'IBOV',
    flag: '🇧🇷',
    category: 'indices',
    currentVolume: 12450000000,
    averageVolume: 15200000000,
    price: 127845,
    priceChange: -1.2,
    volumeRatio: 0.82,
    zScore: -0.9,
    flowType: 'distribution',
    convictionScore: 3.4,
    currency: 'BRL',
  },
  {
    id: 'hk',
    name: 'Hong Kong',
    ticker: 'HSI',
    flag: '🇭🇰',
    category: 'indices',
    currentVolume: 125000000000,
    averageVolume: 110000000000,
    price: 16720.50,
    priceChange: -0.35,
    volumeRatio: 1.13,
    zScore: 1.1,
    flowType: 'neutral',
    convictionScore: 5.8,
    currency: 'HKD',
  },
  {
    id: 'crypto',
    name: 'Cripto Global',
    ticker: 'TOTAL',
    flag: '₿',
    category: 'crypto',
    currentVolume: 142800000000,
    averageVolume: 98500000000,
    price: 3.42,
    priceChange: 4.25,
    volumeRatio: 1.45,
    zScore: 2.4,
    flowType: 'accumulation',
    convictionScore: 9.1,
    currency: 'USD',
  },
  {
    id: 'forex',
    name: 'Mercado Forex',
    ticker: 'EURUSD',
    flag: '💱',
    category: 'forex',
    currentVolume: 4500000,
    averageVolume: 4200000,
    price: 1.0845,
    priceChange: 0.12,
    volumeRatio: 1.07,
    zScore: 0.5,
    flowType: 'neutral',
    convictionScore: 5.2,
    currency: 'USD',
  },
  {
    id: 'europe',
    name: 'Mercado Europeu',
    ticker: 'VGK',
    flag: '🇪🇺',
    category: 'stocks',
    currentVolume: 5200000,
    averageVolume: 4800000,
    price: 68.42,
    priceChange: 0.65,
    volumeRatio: 1.08,
    zScore: 0.7,
    flowType: 'accumulation',
    convictionScore: 6.8,
    currency: 'USD',
  },
  {
    id: 'options',
    name: 'Mercado de Opções',
    ticker: 'VIX',
    flag: '📉',
    category: 'options',
    currentVolume: 1250000,
    averageVolume: 850000,
    price: 14.25,
    priceChange: -2.4,
    volumeRatio: 1.47,
    zScore: 2.1,
    flowType: 'distribution',
    convictionScore: 7.9,
    currency: 'USD',
  },
  {
    id: 'dax',
    name: 'DAX 40',
    ticker: 'DAX',
    flag: '🇩🇪',
    category: 'indices',
    currentVolume: 78000000,
    averageVolume: 72000000,
    price: 18450.30,
    priceChange: 0.55,
    volumeRatio: 1.08,
    zScore: 0.6,
    flowType: 'accumulation',
    convictionScore: 6.2,
    currency: 'EUR',
  },
  {
    id: 'nikkei',
    name: 'Nikkei 225',
    ticker: 'EWJ',
    flag: '🇯🇵',
    category: 'indices',
    currentVolume: 95000000,
    averageVolume: 88000000,
    price: 67.85,
    priceChange: 1.15,
    volumeRatio: 1.08,
    zScore: 0.7,
    flowType: 'accumulation',
    convictionScore: 6.5,
    currency: 'USD',
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
];

export const formatVolume = (value: number): string => {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toString();
};

export const formatPrice = (value: number, currency: string): string => {
  // For very large prices (like Ibovespa ~198k), use compact format
  if (value >= 10000) {
    const options: Intl.NumberFormatOptions = { 
      style: 'currency' as const, 
      currency, 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    };
    if (currency === 'BRL') return new Intl.NumberFormat('pt-BR', options).format(value);
    return new Intl.NumberFormat('en-US', options).format(value);
  }
  const options: Intl.NumberFormatOptions = { style: 'currency' as const, currency };
  if (currency === 'BRL') return new Intl.NumberFormat('pt-BR', options).format(value);
  if (currency === 'HKD') return new Intl.NumberFormat('zh-HK', options).format(value);
  return new Intl.NumberFormat('en-US', options).format(value);
};

export const getFlowTypeLabel = (flowType: MarketData['flowType']): string => {
  const labels = {
    accumulation: 'Acumulação (Compra)',
    distribution: 'Distribuição (Venda)',
    exhaustion: 'Exaustão (Falta de Força)',
    neutral: 'Neutro',
  };
  return labels[flowType];
};