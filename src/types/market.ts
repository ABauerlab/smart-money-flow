export interface MonthlyVolume {
  month: string;
  volume: number;
  average: number;
}

export interface MarketData {
  id: string;
  name: string;
  ticker: string;
  flag: string;
  category: 'stocks' | 'crypto' | 'forex' | 'options' | 'indices' | 'commodities';
  currentVolume: number;
  averageVolume: number;
  price: number;
  priceChange: number;
  volumeRatio: number;
  zScore: number;
  flowType: 'accumulation' | 'distribution' | 'exhaustion' | 'neutral';
  convictionScore: number;
  currency: string;
  historicalVolumes?: number[];
  monthlyVolumes?: MonthlyVolume[];
}

export interface GlobalMetrics {
  riskSentiment: 'risk-on' | 'risk-off' | 'neutral';
  hotMarket: string;
  dominantFlow: 'inflow' | 'outflow' | 'balanced';
  verdict: string;
}

export interface Alert {
  id: string;
  type: 'divergence' | 'attention' | 'opportunity';
  severity: 'high' | 'medium' | 'low';
  message: string;
  market: string;
  timestamp: Date;
}

export interface VolumeCorrelation {
  pair: string;
  correlation: number;
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  market: string;
}

export type FlowType = MarketData['flowType'];