import { MarketData, GlobalMetrics, Alert } from '@/types/market';

export const mockMarketData: MarketData[] = [
  {
    id: 'bvsp',
    name: 'Ibovespa',
    ticker: '^BVSP',
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
    id: 'petr4',
    name: 'Petrobras PN',
    ticker: 'PETR4',
    flag: '🛢️',
    category: 'stocks',
    currentVolume: 85000000,
    averageVolume: 78000000,
    price: 38.42,
    priceChange: 0.85,
    volumeRatio: 1.09,
    zScore: 0.6,
    flowType: 'accumulation',
    convictionScore: 6.4,
    currency: 'BRL',
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    ticker: 'BTC',
    flag: '₿',
    category: 'crypto',
    currentVolume: 42800000000,
    averageVolume: 38500000000,
    price: 95420,
    priceChange: 2.15,
    volumeRatio: 1.11,
    zScore: 0.8,
    flowType: 'accumulation',
    convictionScore: 7.2,
    currency: 'USD',
  },
  {
    id: 'spy',
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
  },
  {
    id: 'qqq',
    name: 'Nasdaq 100',
    ticker: 'QQQ',
    flag: '📈',
    category: 'indices',
    currentVolume: 52000000,
    averageVolume: 48000000,
    price: 512.30,
    priceChange: 1.05,
    volumeRatio: 1.08,
    zScore: 0.7,
    flowType: 'accumulation',
    convictionScore: 6.9,
    currency: 'USD',
  },
  {
    id: 'ewj',
    name: 'Nikkei 225 (ETF)',
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
  {
    id: 'vgk',
    name: 'Mercado Europeu',
    ticker: 'VGK',
    flag: '🇪🇺',
    category: 'indices',
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
    id: 'brent',
    name: 'Petróleo Brent',
    ticker: 'BRENT',
    flag: '🛢️',
    category: 'commodities',
    currentVolume: 1200000,
    averageVolume: 1050000,
    price: 78.42,
    priceChange: 0.95,
    volumeRatio: 1.14,
    zScore: 1.0,
    flowType: 'accumulation',
    convictionScore: 6.7,
    currency: 'USD',
  },
  {
    id: 'ewg',
    name: 'DAX 40 (ETF)',
    ticker: 'EWG',
    flag: '🇩🇪',
    category: 'indices',
    currentVolume: 1800000,
    averageVolume: 1650000,
    price: 32.45,
    priceChange: 0.55,
    volumeRatio: 1.09,
    zScore: 0.6,
    flowType: 'accumulation',
    convictionScore: 6.2,
    currency: 'USD',
  },
  {
    id: 'nya',
    name: 'NYSE Composite',
    ticker: 'NYA',
    flag: '🏛️',
    category: 'indices',
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
    id: 'ewy',
    name: 'KOSPI (ETF)',
    ticker: 'EWY',
    flag: '🇰🇷',
    category: 'indices',
    currentVolume: 2500000,
    averageVolume: 2300000,
    price: 58.20,
    priceChange: 0.35,
    volumeRatio: 1.09,
    zScore: 0.6,
    flowType: 'neutral',
    convictionScore: 5.8,
    currency: 'USD',
  },
  {
    id: 'inda',
    name: 'BSE Sensex (ETF)',
    ticker: 'INDA',
    flag: '🇮🇳',
    category: 'indices',
    currentVolume: 4200000,
    averageVolume: 3800000,
    price: 52.18,
    priceChange: 0.75,
    volumeRatio: 1.11,
    zScore: 0.8,
    flowType: 'accumulation',
    convictionScore: 6.6,
    currency: 'USD',
  },
];

export const mockGlobalMetrics: GlobalMetrics = {
  riskSentiment: 'risk-on',
  hotMarket: 'Bitcoin',
  dominantFlow: 'inflow',
  verdict: 'Dinheiro institucional migrando fortemente para Cripto e S&P 500. Brasil em modo de saída com volume abaixo da média.',
};

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'divergence',
    severity: 'high',
    message: 'Volume em Bitcoin acima da média com preço estável indica forte absorção institucional',
    market: 'Bitcoin',
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
