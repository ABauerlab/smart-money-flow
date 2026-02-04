import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  historicalVolumes?: number[];
}

interface CacheRow {
  id: string;
  name: string;
  ticker: string;
  flag: string;
  current_volume: number;
  average_volume: number;
  price: number;
  price_change: number;
  volume_ratio: number;
  z_score: number;
  flow_type: string;
  conviction_score: number;
  currency: string;
  historical_volumes: number[];
  fetched_at: string;
}

// Cache duration in minutes for each source
const CACHE_DURATION = {
  usa: 15,      // Alpha Vantage: cache 15 min (free plan: 25 calls/day)
  crypto: 5,    // CoinMarketCap: cache 5 min
  brazil: 5,    // Brapi: cache 5 min
};

function calculateZScore(current: number, average: number, stdDev?: number): number {
  const estimatedStdDev = stdDev || average * 0.15;
  if (estimatedStdDev === 0) return 0;
  return (current - average) / estimatedStdDev;
}

function determineFlowType(priceChange: number, volumeRatio: number): MarketData['flowType'] {
  if (volumeRatio > 1.2 && priceChange >= 0) return 'accumulation';
  if (volumeRatio > 1.2 && priceChange < -0.5) return 'distribution';
  if (volumeRatio < 0.7 && priceChange > 1) return 'exhaustion';
  return 'neutral';
}

function calculateConviction(volumeRatio: number, zScore: number, flowType: string): number {
  let score = 5;
  score += Math.min(zScore, 3) * 1.2;
  score += (volumeRatio - 1) * 2;
  if (flowType === 'accumulation') score += 1;
  if (flowType === 'distribution') score -= 0.5;
  return Math.max(0, Math.min(10, score));
}

function cacheRowToMarketData(row: CacheRow): MarketData {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    flag: row.flag,
    currentVolume: Number(row.current_volume),
    averageVolume: Number(row.average_volume),
    price: Number(row.price),
    priceChange: Number(row.price_change),
    volumeRatio: Number(row.volume_ratio),
    zScore: Number(row.z_score),
    flowType: row.flow_type as MarketData['flowType'],
    convictionScore: Number(row.conviction_score),
    currency: row.currency,
    historicalVolumes: row.historical_volumes || [],
  };
}

function isCacheValid(fetchedAt: string, cacheMinutes: number): boolean {
  const cacheTime = new Date(fetchedAt).getTime();
  const now = Date.now();
  return (now - cacheTime) < cacheMinutes * 60 * 1000;
}

// deno-lint-ignore no-explicit-any
async function fetchUSMarket(supabase: SupabaseClient<any, any, any>): Promise<MarketData | null> {
  const { data: cached } = await supabase
    .from('market_data_cache')
    .select('*')
    .eq('id', 'usa')
    .maybeSingle();

  const cachedRow = cached as CacheRow | null;

  if (cachedRow && isCacheValid(cachedRow.fetched_at, CACHE_DURATION.usa)) {
    console.log('Using cached US market data');
    return cacheRowToMarketData(cachedRow);
  }

  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (!apiKey) {
    console.error('ALPHA_VANTAGE_API_KEY not configured');
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data['Note'] || data['Information']) {
      console.warn('Alpha Vantage rate limit hit, using cache');
      return cachedRow ? cacheRowToMarketData(cachedRow) : null;
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      console.error('Alpha Vantage: Invalid response', data);
      return cachedRow ? cacheRowToMarketData(cachedRow) : null;
    }

    const dates = Object.keys(timeSeries).slice(0, 21);
    if (dates.length === 0) {
      return cachedRow ? cacheRowToMarketData(cachedRow) : null;
    }

    const todayData = timeSeries[dates[0]];
    const yesterdayData = timeSeries[dates[1]];

    const price = parseFloat(todayData['4. close']) || 0;
    const previousClose = parseFloat(yesterdayData['4. close']) || price;
    const priceChange = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
    const currentVolume = parseFloat(todayData['5. volume']) || 0;

    const volumes = dates.slice(0, 20).map((d: string) => parseFloat(timeSeries[d]['5. volume']) || 0);
    const historicalVolumes = volumes.slice(0, 10);
    const averageVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;

    const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
    const zScore = calculateZScore(currentVolume, averageVolume);
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    const marketData: MarketData = {
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
      historicalVolumes,
    };

    await supabase.from('market_data_cache').upsert({
      id: 'usa',
      name: marketData.name,
      ticker: marketData.ticker,
      flag: marketData.flag,
      current_volume: marketData.currentVolume,
      average_volume: marketData.averageVolume,
      price: marketData.price,
      price_change: marketData.priceChange,
      volume_ratio: marketData.volumeRatio,
      z_score: marketData.zScore,
      flow_type: marketData.flowType,
      conviction_score: marketData.convictionScore,
      currency: marketData.currency,
      historical_volumes: historicalVolumes,
      fetched_at: new Date().toISOString(),
    });

    return marketData;
  } catch (error) {
    console.error('Error fetching US market data:', error);
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
  }
}

// deno-lint-ignore no-explicit-any
async function fetchCryptoMarket(supabase: SupabaseClient<any, any, any>): Promise<MarketData | null> {
  const { data: cached } = await supabase
    .from('market_data_cache')
    .select('*')
    .eq('id', 'crypto')
    .maybeSingle();

  const cachedRow = cached as CacheRow | null;

  if (cachedRow && isCacheValid(cachedRow.fetched_at, CACHE_DURATION.crypto)) {
    console.log('Using cached Crypto market data');
    return cacheRowToMarketData(cachedRow);
  }

  const apiKey = Deno.env.get('COINMARKETCAP_API_KEY');
  if (!apiKey) {
    console.error('COINMARKETCAP_API_KEY not configured');
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
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
      return cachedRow ? cacheRowToMarketData(cachedRow) : null;
    }

    const { total_market_cap, total_volume_24h } = data.data.quote.USD;
    const estimatedAvgVolume = total_market_cap * 0.04;
    const volumeRatio = total_volume_24h / estimatedAvgVolume;
    const zScore = calculateZScore(total_volume_24h, estimatedAvgVolume);
    const priceChange = data.data.btc_dominance_24h_percentage_change || 0;
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    const existingHistory = cachedRow?.historical_volumes || [];
    const historicalVolumes = [total_volume_24h, ...existingHistory].slice(0, 10);

    const marketData: MarketData = {
      id: 'crypto',
      name: 'Cripto Global',
      ticker: 'TOTAL',
      flag: '₿',
      currentVolume: total_volume_24h,
      averageVolume: estimatedAvgVolume,
      price: total_market_cap / 1e12,
      priceChange,
      volumeRatio,
      zScore,
      flowType,
      convictionScore,
      currency: 'USD',
      historicalVolumes,
    };

    await supabase.from('market_data_cache').upsert({
      id: 'crypto',
      name: marketData.name,
      ticker: marketData.ticker,
      flag: marketData.flag,
      current_volume: marketData.currentVolume,
      average_volume: marketData.averageVolume,
      price: marketData.price,
      price_change: marketData.priceChange,
      volume_ratio: marketData.volumeRatio,
      z_score: marketData.zScore,
      flow_type: marketData.flowType,
      conviction_score: marketData.convictionScore,
      currency: marketData.currency,
      historical_volumes: historicalVolumes,
      fetched_at: new Date().toISOString(),
    });

    return marketData;
  } catch (error) {
    console.error('Error fetching crypto market data:', error);
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
  }
}

// deno-lint-ignore no-explicit-any
async function fetchBrazilMarket(supabase: SupabaseClient<any, any, any>): Promise<MarketData | null> {
  const { data: cached } = await supabase
    .from('market_data_cache')
    .select('*')
    .eq('id', 'brazil')
    .maybeSingle();

  const cachedRow = cached as CacheRow | null;

  if (cachedRow && isCacheValid(cachedRow.fetched_at, CACHE_DURATION.brazil)) {
    console.log('Using cached Brazil market data');
    return cacheRowToMarketData(cachedRow);
  }

  const brapiKey = Deno.env.get('BRAPI_API_KEY');
  if (!brapiKey) {
    console.error('BRAPI_API_KEY not configured');
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
  }

  try {
    const fxRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const fxData = await fxRes.json();
    const usdBrl = parseFloat(fxData.USDBRL?.bid) || 5.0;

    const brapiUrl = `https://brapi.dev/api/quote/%5EBVSP?token=${brapiKey}`;
    const brapiRes = await fetch(brapiUrl);
    const brapiData = await brapiRes.json();

    if (!brapiData.results?.[0]) {
      console.error('Brapi: Invalid response', brapiData);
      return cachedRow ? cacheRowToMarketData(cachedRow) : null;
    }

    const ibov = brapiData.results[0];
    const price = ibov.regularMarketPrice || 0;
    const priceChange = ibov.regularMarketChangePercent || 0;
    const currentVolume = ibov.regularMarketVolume || 12_000_000_000;
    const averageVolume = ibov.averageDailyVolume10Day || 15_000_000_000;

    const volumeInUsd = currentVolume / usdBrl;
    const avgVolumeInUsd = averageVolume / usdBrl;

    const volumeRatio = avgVolumeInUsd > 0 ? volumeInUsd / avgVolumeInUsd : 1;
    const zScore = calculateZScore(volumeInUsd, avgVolumeInUsd);
    const flowType = determineFlowType(priceChange, volumeRatio);
    const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

    const existingHistory = cachedRow?.historical_volumes || [];
    const historicalVolumes = [currentVolume, ...existingHistory].slice(0, 10);

    const marketData: MarketData = {
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
      historicalVolumes,
    };

    await supabase.from('market_data_cache').upsert({
      id: 'brazil',
      name: marketData.name,
      ticker: marketData.ticker,
      flag: marketData.flag,
      current_volume: marketData.currentVolume,
      average_volume: marketData.averageVolume,
      price: marketData.price,
      price_change: marketData.priceChange,
      volume_ratio: marketData.volumeRatio,
      z_score: marketData.zScore,
      flow_type: marketData.flowType,
      conviction_score: marketData.convictionScore,
      currency: marketData.currency,
      historical_volumes: historicalVolumes,
      fetched_at: new Date().toISOString(),
    });

    return marketData;
  } catch (error) {
    console.error('Error fetching Brazil market data:', error);
    return cachedRow ? cacheRowToMarketData(cachedRow) : null;
  }
}

function generateGlobalMetrics(markets: MarketData[]) {
  const sortedByConviction = [...markets].sort((a, b) => b.convictionScore - a.convictionScore);
  const hotMarket = sortedByConviction[0];
  
  const usMarket = markets.find(m => m.id === 'usa');
  const cryptoMarket = markets.find(m => m.id === 'crypto');
  const brazilMarket = markets.find(m => m.id === 'brazil');
  
  let riskSentiment: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
  let dominantFlow: 'inflow' | 'outflow' | 'balanced' = 'balanced';
  
  if (cryptoMarket && usMarket) {
    if (cryptoMarket.volumeRatio > 1.2 && cryptoMarket.flowType === 'accumulation') {
      riskSentiment = 'risk-on';
      dominantFlow = 'inflow';
    } else if (usMarket.volumeRatio > 1.2 && cryptoMarket.volumeRatio < 0.9) {
      riskSentiment = 'risk-off';
      dominantFlow = 'outflow';
    }
  }

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

  return { riskSentiment, hotMarket: hotMarket?.name || 'N/A', dominantFlow, verdict };
}

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

  return alerts.slice(0, 5);
}

function calculateVolumeCorrelation(markets: MarketData[]): { pair: string; correlation: number }[] {
  const correlations: { pair: string; correlation: number }[] = [];
  
  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const m1 = markets[i];
      const m2 = markets[j];
      
      if (m1.historicalVolumes && m2.historicalVolumes) {
        const len = Math.min(m1.historicalVolumes.length, m2.historicalVolumes.length);
        if (len >= 3) {
          const v1 = m1.historicalVolumes.slice(0, len);
          const v2 = m2.historicalVolumes.slice(0, len);
          
          const max1 = Math.max(...v1);
          const max2 = Math.max(...v2);
          const norm1 = v1.map(v => v / max1);
          const norm2 = v2.map(v => v / max2);
          
          const mean1 = norm1.reduce((a, b) => a + b, 0) / len;
          const mean2 = norm2.reduce((a, b) => a + b, 0) / len;
          
          let numerator = 0;
          let denom1 = 0;
          let denom2 = 0;
          
          for (let k = 0; k < len; k++) {
            const diff1 = norm1[k] - mean1;
            const diff2 = norm2[k] - mean2;
            numerator += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
          }
          
          const correlation = denom1 > 0 && denom2 > 0 
            ? numerator / Math.sqrt(denom1 * denom2) 
            : 0;
          
          correlations.push({
            pair: `${m1.ticker}/${m2.ticker}`,
            correlation: Math.round(correlation * 100) / 100,
          });
        }
      }
    }
  }
  
  return correlations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching market data with caching...');

    const [usMarket, cryptoMarket, brazilMarket] = await Promise.all([
      fetchUSMarket(supabase),
      fetchCryptoMarket(supabase),
      fetchBrazilMarket(supabase),
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
    const correlations = calculateVolumeCorrelation(markets);

    const response = {
      markets,
      globalMetrics,
      alerts,
      correlations,
      lastUpdated: new Date().toISOString(),
    };

    console.log('Market data fetched:', {
      marketsCount: markets.length,
      markets: markets.map(m => m.id),
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
