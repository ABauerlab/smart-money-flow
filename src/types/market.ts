export interface MarketData {
  id: string;
  name: string;
  ticker: string;
  flag: string;
  currentVolume: number;
  averageVolume: number;
  price: number;
  priceChange: number;
  volumeRatio: number;
  zScore: number;
  flowType: 'accumulation' | 'distribution' | 'exhaustion' | 'neutral';
  convictionScore: number;
  currency: string;
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

export type FlowType = MarketData['flowType'];
