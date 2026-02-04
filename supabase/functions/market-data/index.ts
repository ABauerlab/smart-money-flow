import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketData {
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

// Calculate Z-Score for volume anomaly detection
function calculateZScore(current: number, average: number, stdDev?: number): number {
  const estimatedStdDev = stdDev || average * 0.15;
  return (current - average) / estimatedStdDev;
}

// Determine flow type based on price change and volume ratio
function determineFlowType(priceChange: number, volumeRatio: number): MarketData['flowType'] {
  if (volumeRatio > 1.2 && priceChange >= 0) return 'accumulation';
  if (volumeRatio > 1.2 && priceChange < -0.5) return 'distribution';
  if (volumeRatio < 0.7 && priceChange > 1) return 'exhaustion';
  return 'neutral';
}

// Calculate conviction score (0-10)
function calculateConviction(volumeRatio: number, zScore: number, flowType: string): number {
  let score = 5;
  score += Math.min(zScore, 3) * 1.2;
  score += (volumeRatio - 1) * 2;
  if (flowType === 'accumulation') score += 1;
  if (flowType === 'distribution') score -= 0.5;
  return Math.max(0, Math.min(10, score));
}

// Fetch US Market Data (Alpha Vantage - SPY)
async function fetchUSMarket(): Promise<MarketData | null> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (!apiKey) {
    console.error('ALPHA_VANTAGE_API_KEY not configured');
    return null;
  }

  try {
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${apiKey}`;
    const quoteRes = await fetch(quoteUrl);
    const quoteData = await quoteRes.json();

    const dailyUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&apikey=${apiKey}`;
    const dailyRes = await fetch(dailyUrl);
    const dailyData = await dailyRes.json();

    const quote = quoteData['Global Quote'];
    const timeSeries = dailyData['Time Series (Daily)'];

    if (!quote || !timeSeries) {
      console.error('Alpha Vantage: Invalid response', { quoteData, dailyData });
      return null;
    }

    const price = parseFloat(quote['05. price']) || 0;
    const priceChange = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;
    const currentVolume = parseFloat(quote['06. volume']) || 0;

    // Calculate 20-day average volume
    const dates = Object.keys(timeSeries).slice(0, 20);
    const volumes = dates.map(d => parseFloat(timeSeries[d]['5. volume']) || 0);
    const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
    const zScore = calculateZScore(currentVolume, averageVolume);
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    return {
      id: 'usa',
      name: 'S&P 500',
      ticker: 'SPY',
      flag: '🇺🇸',
      currentVolume,
      averageVolume,
      price,
      priceChange,
      volumeRatio,
      zScore,
      flowType,
      convictionScore,
      currency: 'USD',
    };
  } catch (error) {
    console.error('Error fetching US market data:', error);
    return null;
  }
}

// Fetch Crypto Market Data (CoinMarketCap)
async function fetchCryptoMarket(): Promise<MarketData | null> {
  const apiKey = Deno.env.get('COINMARKETCAP_API_KEY');
  if (!apiKey) {
    console.error('COINMARKETCAP_API_KEY not configured');
    return null;
  }

  try {
    const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
    const res = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
    });
    const data = await res.json();

    if (!data.data) {
      console.error('CoinMarketCap: Invalid response', data);
      return null;
    }

    const { total_market_cap, total_volume_24h } = data.data.quote.USD;
    
    // Use market cap as proxy for average (stable metric)
    // Volume/MarketCap ratio typically around 3-5%
    const estimatedAvgVolume = total_market_cap * 0.04;
    const volumeRatio = total_volume_24h / estimatedAvgVolume;
    const zScore = calculateZScore(total_volume_24h, estimatedAvgVolume);
    
    // Calculate price change from BTC dominance shift
    const priceChange = data.data.btc_dominance_24h_percentage_change || 0;
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    return {
      id: 'crypto',
      name: 'Cripto Global',
      ticker: 'TOTAL',
      flag: '₿',
      currentVolume: total_volume_24h,
      averageVolume: estimatedAvgVolume,
      price: total_market_cap / 1e12, // Trillions
      priceChange,
      volumeRatio,
      zScore,
      flowType,
      convictionScore,
      currency: 'USD',
    };
  } catch (error) {
    console.error('Error fetching crypto market data:', error);
    return null;
  }
}

// Fetch Brazil Market Data (Brapi + AwesomeAPI for USD/BRL)
async function fetchBrazilMarket(): Promise<MarketData | null> {
  const brapiKey = Deno.env.get('BRAPI_API_KEY');
  
  if (!brapiKey) {
    console.error('BRAPI_API_KEY not configured');
    return null;
  }

  try {
    // Fetch USD/BRL exchange rate from AwesomeAPI
    const fxRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const fxData = await fxRes.json();
    const usdBrl = parseFloat(fxData.USDBRL?.bid) || 5.0;

    // Fetch IBOV data from Brapi
    const brapiUrl = `https://brapi.dev/api/quote/%5EBVSP?token=${brapiKey}`;
    const brapiRes = await fetch(brapiUrl);
    const brapiData = await brapiRes.json();

    if (!brapiData.results?.[0]) {
      console.error('Brapi: Invalid response', brapiData);
      return null;
    }

    const ibov = brapiData.results[0];
    const price = ibov.regularMarketPrice || 0;
    const priceChange = ibov.regularMarketChangePercent || 0;
    
    // Estimate volumes (Brapi provides limited volume data)
    const currentVolume = ibov.regularMarketVolume || 12_000_000_000;
    const averageVolume = ibov.averageDailyVolume10Day || 15_000_000_000;

    // Convert to USD for cross-market comparison
    const volumeInUsd = currentVolume / usdBrl;
    const avgVolumeInUsd = averageVolume / usdBrl;

    const volumeRatio = avgVolumeInUsd > 0 ? volumeInUsd / avgVolumeInUsd : 1;
    const zScore = calculateZScore(volumeInUsd, avgVolumeInUsd);
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    return {
      id: 'brazil',
      name: 'Ibovespa',
      ticker: 'IBOV',
      flag: '🇧🇷',
      currentVolume,
      averageVolume,
      price,
      priceChange,
      volumeRatio,
      zScore,
      flowType,
      convictionScore,
      currency: 'BRL',
    };
  } catch (error) {
    console.error('Error fetching Brazil market data:', error);
    return null;
  }
}

// Generate global metrics and verdict
function generateGlobalMetrics(markets: MarketData[]) {
  const sortedByConviction = [...markets].sort((a, b) => b.convictionScore - a.convictionScore);
  const hotMarket = sortedByConviction[0];
  
  // Determine risk sentiment
  const usMarket = markets.find(m => m.id === 'usa');
  const cryptoMarket = markets.find(m => m.id === 'crypto');
  const brazilMarket = markets.find(m => m.id === 'brazil');
  
  let riskSentiment: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
  let dominantFlow: 'inflow' | 'outflow' | 'balanced' = 'balanced';
  
  // Risk-On: Money flowing to Crypto/Emerging
  // Risk-Off: Money flowing to US/Safe havens
  if (cryptoMarket && usMarket) {
    if (cryptoMarket.volumeRatio > 1.2 && cryptoMarket.flowType === 'accumulation') {
      riskSentiment = 'risk-on';
      dominantFlow = 'inflow';
    } else if (usMarket.volumeRatio > 1.2 && cryptoMarket.volumeRatio < 0.9) {
      riskSentiment = 'risk-off';
      dominantFlow = 'outflow';
    }
  }

  // Generate verdict
  let verdict = '';
  if (hotMarket) {
    if (riskSentiment === 'risk-on') {
      verdict = `Dinheiro institucional migrando para ativos de risco. ${hotMarket.name} lidera com volume ${((hotMarket.volumeRatio - 1) * 100).toFixed(0)}% acima da média.`;
    } else if (riskSentiment === 'risk-off') {
      verdict = `Movimento de aversão ao risco detectado. Capital fluindo para mercados desenvolvidos. ${brazilMarket?.flowType === 'distribution' ? 'Brasil em modo de saída.' : ''}`;
    } else {
      verdict = `Mercado em consolidação. ${hotMarket.name} mostra maior atividade institucional com Z-Score de ${hotMarket.zScore.toFixed(1)}σ.`;
    }
  }

  return {
    riskSentiment,
    hotMarket: hotMarket?.name || 'N/A',
    dominantFlow,
    verdict,
  };
}

// Generate alerts based on market conditions
function generateAlerts(markets: MarketData[]) {
  const alerts: Array<{
    id: string;
    type: 'divergence' | 'attention' | 'opportunity';
    severity: 'high' | 'medium' | 'low';
    message: string;
    market: string;
    timestamp: string;
  }> = [];

  markets.forEach((market, index) => {
    // High volume divergence
    if (market.zScore > 2) {
      alerts.push({
        id: `alert-${index}-1`,
        type: 'divergence',
        severity: 'high',
        message: `Volume ${((market.volumeRatio - 1) * 100).toFixed(0)}% acima da média com ${market.flowType === 'accumulation' ? 'preço estável indica forte absorção institucional' : 'pressão vendedora elevada'}`,
        market: market.name,
        timestamp: new Date().toISOString(),
      });
    }

    // Low volume warning
    if (market.volumeRatio < 0.7) {
      alerts.push({
        id: `alert-${index}-2`,
        type: 'attention',
        severity: 'medium',
        message: `Volume ${((1 - market.volumeRatio) * 100).toFixed(0)}% abaixo da média indica baixa liquidez e possível fuga de capital`,
        market: market.name,
        timestamp: new Date().toISOString(),
      });
    }

    // Opportunity detection
    if (market.flowType === 'accumulation' && market.convictionScore > 7) {
      alerts.push({
        id: `alert-${index}-3`,
        type: 'opportunity',
        severity: 'low',
        message: `Padrão de acumulação institucional detectado com alta convicção (${market.convictionScore.toFixed(1)}/10)`,
        market: market.name,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return alerts.slice(0, 5); // Limit to 5 alerts
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching market data from all sources...');

    // Fetch all markets in parallel
    const [usMarket, cryptoMarket, brazilMarket] = await Promise.all([
      fetchUSMarket(),
      fetchCryptoMarket(),
      fetchBrazilMarket(),
    ]);

    const markets = [usMarket, cryptoMarket, brazilMarket].filter(Boolean) as MarketData[];

    if (markets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch any market data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const globalMetrics = generateGlobalMetrics(markets);
    const alerts = generateAlerts(markets);

    const response = {
      markets,
      globalMetrics,
      alerts,
      lastUpdated: new Date().toISOString(),
    };

    console.log('Market data fetched successfully:', {
      marketsCount: markets.length,
      alertsCount: alerts.length,
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in market-data function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
