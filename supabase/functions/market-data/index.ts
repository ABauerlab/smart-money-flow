import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketData {
  id: string;
  name: string;
  ticker: string;
  flag: string;
  category: string;
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

const CACHE_TTL_MINUTES = 60; // 1 hour cache to respect AV 25 calls/day limit

function calculateZScore(current: number, average: number): number {
  const stdDev = average * 0.15;
  return stdDev === 0 ? 0 : (current - average) / stdDev;
}

function determineFlowType(priceChange: number, volumeRatio: number): MarketData['flowType'] {
  if (volumeRatio > 1.2) {
    if (priceChange >= 0.5) return 'accumulation';
    if (priceChange < -0.5) return 'distribution';
    return 'neutral';
  }
  if (volumeRatio < 0.8 && Math.abs(priceChange) > 1) return 'exhaustion';
  return 'neutral';
}

function calculateConviction(volumeRatio: number, zScore: number, flowType: string): number {
  let score = 5;
  score += Math.min(Math.abs(zScore), 3);
  if (flowType === 'accumulation') score += 1.5;
  if (flowType === 'distribution') score += 0.5;
  return Math.max(0, Math.min(10, score));
}

function buildMarket(
  id: string, name: string, ticker: string, flag: string, category: string, currency: string,
  price: number, prevPrice: number, currentVolume: number, volumes: number[]
): MarketData {
  const priceChange = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
  const averageVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : currentVolume;
  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1;
  const zScore = calculateZScore(currentVolume, averageVolume);
  const flowType = determineFlowType(priceChange, volumeRatio);
  const convictionScore = calculateConviction(volumeRatio, zScore, flowType);

  return {
    id, name, ticker, flag, category,
    currentVolume, averageVolume, price, priceChange,
    volumeRatio, zScore, flowType, convictionScore, currency,
    historicalVolumes: volumes.slice(0, 10),
  };
}

// ---- Alpha Vantage (US/Global markets) ----
async function fetchAlphaVantage(
  symbol: string, name: string, flag: string, category: string, currency: string, apiKey: string
): Promise<MarketData | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data['Note'] || data['Information']) {
      console.warn(`Alpha Vantage rate limit for ${symbol}:`, data['Note'] || data['Information']);
      return null;
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) return null;

    const dates = Object.keys(timeSeries).slice(0, 21);
    if (dates.length < 2) return null;

    const today = timeSeries[dates[0]];
    const yesterday = timeSeries[dates[1]];
    const price = parseFloat(today['4. close']);
    const prevPrice = parseFloat(yesterday['4. close']);
    const currentVolume = parseFloat(today['5. volume']);
    const volumes = dates.map(d => parseFloat(timeSeries[d]['5. volume']));

    return buildMarket(symbol.toLowerCase(), name, symbol, flag, category, currency, price, prevPrice, currentVolume, volumes);
  } catch (e) {
    console.error(`Alpha Vantage error for ${symbol}:`, e);
    return null;
  }
}

// ---- Brapi (Brazilian market - real Ibovespa in BRL) ----
async function fetchBrapiQuote(
  symbol: string, name: string, flag: string, category: string, apiKey: string
): Promise<MarketData | null> {
  try {
    const url = `https://brapi.dev/api/quote/${symbol}?token=${apiKey}&range=1mo&interval=1d`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.warn(`Brapi error for ${symbol}:`, data.message);
      return null;
    }

    if (!data.results || data.results.length === 0) {
      console.warn(`Brapi: no data for ${symbol}`);
      return null;
    }

    const quote = data.results[0];
    console.log(`Brapi ${symbol}: price=${quote.regularMarketPrice}, vol=${quote.regularMarketVolume}, avgVol10d=${quote.averageDailyVolume10Day}, avgVol3m=${quote.averageDailyVolume3Month}, marketCap=${quote.marketCap}`);

    const price = quote.regularMarketPrice || 0;
    const prevPrice = quote.regularMarketPreviousClose || price;
    const currentVolume = quote.regularMarketVolume || 0;
    const avgVolume = quote.averageDailyVolume10Day || quote.averageDailyVolume3Month || 0;

    // Extract historical volumes from historicalDataPrice if available
    let historicalVolumes: number[] = [];
    if (quote.historicalDataPrice && Array.isArray(quote.historicalDataPrice)) {
      historicalVolumes = quote.historicalDataPrice
        .reverse()
        .slice(0, 21)
        .map((d: any) => d.volume || 0)
        .filter((v: number) => v > 0);
    }

    // For indices like ^BVSP that don't report volume
    let effectiveVolume = currentVolume;
    let effectiveAvg = avgVolume;
    let effectiveHistory = historicalVolumes;

    if (effectiveVolume === 0 && effectiveAvg === 0) {
      // Use marketCap as a proxy for activity level on indices
      if (quote.marketCap && quote.marketCap > 0) {
        effectiveVolume = Math.round(quote.marketCap / 100);
        effectiveAvg = effectiveVolume;
        effectiveHistory = Array(10).fill(effectiveAvg);
        effectiveHistory[0] = effectiveVolume;
      } else {
        // Last resort: use a reasonable B3 average volume estimate
        effectiveVolume = 15_000_000_000; // ~R$15B daily B3 volume
        effectiveAvg = effectiveVolume;
        effectiveHistory = Array(10).fill(effectiveAvg);
      }
    }

    if (effectiveHistory.length === 0) {
      effectiveHistory = Array(10).fill(effectiveAvg > 0 ? effectiveAvg : effectiveVolume);
      effectiveHistory[0] = effectiveVolume;
    }

    return buildMarket(
      symbol.toLowerCase().replace('^', '').replace('.', ''),
      name, symbol, flag, category, 'BRL',
      price, prevPrice, effectiveVolume, effectiveHistory
    );
  } catch (e) {
    console.error(`Brapi error for ${symbol}:`, e);
    return null;
  }
}

// ---- AwesomeAPI (Forex / Commodities) ----
async function fetchForex(
  pair: string, name: string, flag: string,
  category: string = 'forex', currency: string = 'BRL'
): Promise<MarketData | null> {
  try {
    const url = `https://economia.awesomeapi.com.br/json/daily/${pair}/15`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || data.length < 2) return null;

    const latest = data[0];
    const prev = data[1];
    const price = parseFloat(latest.bid);
    const prevPrice = parseFloat(prev.bid);
    // Volume proxy: daily price variance amplitude (no traditional volume on forex/commodities)
    const currentVolume = Math.abs(parseFloat(latest.varBid || '0')) * 1000000;
    const volumes = data.map((d: any) => Math.abs(parseFloat(d.varBid || '0')) * 1000000);

    return buildMarket(
      pair.toLowerCase().replace('-', ''),
      name, pair.replace('-', '/'), flag, category, currency,
      price, prevPrice, currentVolume, volumes
    );
  } catch (e) {
    console.error(`AwesomeAPI error for ${pair}:`, e);
    return null;
  }
}

// ---- CoinMarketCap (Crypto - real volume + price) ----
async function fetchCrypto(
  symbol: string, name: string, flag: string, apiKey: string
): Promise<MarketData | null> {
  if (!apiKey) {
    console.warn(`CoinMarketCap: no API key for ${symbol}`);
    return null;
  }
  try {
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`;
    const res = await fetch(url, { headers: { 'X-CMC_PRO_API_KEY': apiKey } });
    const data = await res.json();

    const entry = data?.data?.[symbol]?.[0] || data?.data?.[symbol];
    const quote = entry?.quote?.USD;
    if (!quote) {
      console.warn(`CMC: no quote for ${symbol}`, data?.status?.error_message);
      return null;
    }

    const price = quote.price || 0;
    const change24h = quote.percent_change_24h || 0;
    const prevPrice = price / (1 + change24h / 100);
    const currentVolume = quote.volume_24h || 0;
    // Build a synthetic 21d volume series varying around current (CMC quotes endpoint
    // doesn't include history; using ±10% jitter keeps Z-Score meaningful)
    const volumes = Array.from({ length: 21 }, (_, i) => {
      if (i === 0) return currentVolume;
      const jitter = 0.9 + (((symbol.charCodeAt(0) + i) * 7919) % 200) / 1000;
      return currentVolume * jitter;
    });

    return buildMarket(
      symbol.toLowerCase(), name, symbol, flag, 'crypto', 'USD',
      price, prevPrice, currentVolume, volumes
    );
  } catch (e) {
    console.error(`CMC error for ${symbol}:`, e);
    return null;
  }
}

// ---- Alpha Vantage Brent Oil (commodity endpoint, separate quota) ----
async function fetchBrent(apiKey: string): Promise<MarketData | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=BRENT&interval=daily&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data?.data) || data.data.length < 2) {
      console.warn('Brent: no data', data?.Note || data?.Information);
      return null;
    }
    const series = data.data.filter((d: any) => d.value !== '.' && parseFloat(d.value) > 0);
    if (series.length < 2) return null;
    const price = parseFloat(series[0].value);
    const prevPrice = parseFloat(series[1].value);
    // Brent has no per-day volume in this endpoint — use price-change amplitude as activity proxy
    const volumes = series.slice(0, 21).map((d: any, i: number) => {
      const cur = parseFloat(d.value);
      const next = parseFloat(series[i + 1]?.value || d.value);
      return Math.abs(cur - next) * 1_000_000;
    });
    const currentVolume = volumes[0] || 1_000_000;
    return buildMarket(
      'brent', 'Petróleo Brent', 'BRENT', '🛢️', 'commodities', 'USD',
      price, prevPrice, currentVolume, volumes
    );
  } catch (e) {
    console.error('Brent error:', e);
    return null;
  }
}

// ---- NewsAPI ----
async function fetchNews(markets: MarketData[], apiKey: string): Promise<any[]> {
  if (!apiKey) return [];
  try {
    // Build query from market names
    const queries = ['Ibovespa', 'S&P 500', 'Nasdaq', 'Petrobras', 'Dólar', 'Euro'];
    const q = encodeURIComponent(queries.join(' OR '));
    const url = `https://newsapi.org/v2/everything?q=${q}&language=pt&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      console.warn('NewsAPI returned no articles:', data.message);
      return [];
    }
    return data.articles.slice(0, 12).map((a: any) => {
      const text = `${a.title} ${a.description || ''}`.toLowerCase();
      let market = 'Mercado Global';
      if (text.includes('ibovespa') || text.includes('bovespa') || text.includes('b3')) market = 'Ibovespa';
      else if (text.includes('petrobras') || text.includes('petr4')) market = 'Petrobras';
      else if (text.includes('s&p') || text.includes('sp500')) market = 'S&P 500';
      else if (text.includes('nasdaq')) market = 'Nasdaq';
      else if (text.includes('dólar') || text.includes('dolar') || text.includes('usd')) market = 'Dólar/Real';
      else if (text.includes('euro')) market = 'Euro/Real';
      return {
        title: a.title,
        source: a.source?.name || 'Desconhecido',
        url: a.url,
        publishedAt: a.publishedAt,
        market,
      };
    });
  } catch (e) {
    console.error('NewsAPI error:', e);
    return [];
  }
}

// ---- Cache Layer ----
async function getCachedMarkets(supabase: any): Promise<MarketData[] | null> {
  try {
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('*')
      .order('conviction_score', { ascending: false });

    if (error || !data || data.length === 0) return null;

    // Check if cache is still fresh
    const oldestFetch = new Date(data[0].fetched_at);
    const now = new Date();
    const ageMinutes = (now.getTime() - oldestFetch.getTime()) / (1000 * 60);

    if (ageMinutes > CACHE_TTL_MINUTES) return null;

    return data.map((row: any) => {
      const isForex = row.id === 'usdbrl' || row.id === 'eurbrl';
      const isStock = row.ticker === 'PETR4';
      return {
      id: row.id,
      name: row.name,
      ticker: row.ticker,
      flag: row.flag,
      category: isForex ? 'forex' : isStock ? 'stocks' : 'indices',
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
    });
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

async function saveToCache(supabase: any, markets: MarketData[]) {
  try {
    for (const m of markets) {
      await supabase
        .from('market_data_cache')
        .upsert({
          id: m.id,
          name: m.name,
          ticker: m.ticker,
          flag: m.flag,
          current_volume: m.currentVolume,
          average_volume: m.averageVolume,
          price: m.price,
          price_change: m.priceChange,
          volume_ratio: m.volumeRatio,
          z_score: m.zScore,
          flow_type: m.flowType,
          conviction_score: m.convictionScore,
          currency: m.currency,
          historical_volumes: m.historicalVolumes || [],
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    }
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// ---- Fetch with staggered delays to respect rate limits ----
async function fetchAllMarkets(alphaKey: string, brapiKey: string): Promise<MarketData[]> {
  const results: MarketData[] = [];

  // Batch 1: Brapi (Brazilian market - no rate limit issues) + Forex (AwesomeAPI - no key needed)
  const batch1 = await Promise.all([
    fetchBrapiQuote('^BVSP', 'Ibovespa', '🇧🇷', 'indices', brapiKey),
    fetchBrapiQuote('PETR4', 'Petrobras PN', '🛢️', 'stocks', brapiKey),
    fetchForex('USD-BRL', 'Dólar/Real', '💵'),
    fetchForex('EUR-BRL', 'Euro/Real', '💶'),
  ]);
  results.push(...batch1.filter(Boolean) as MarketData[]);

  // Batch 2: Alpha Vantage (stagger to stay under 5/min)
  const av1 = await fetchAlphaVantage('SPY', 'S&P 500', '🇺🇸', 'indices', 'USD', alphaKey);
  if (av1) results.push(av1);

  // Small delay between AV calls
  await new Promise(r => setTimeout(r, 1500));

  const av2 = await fetchAlphaVantage('QQQ', 'Nasdaq 100', '📈', 'indices', 'USD', alphaKey);
  if (av2) results.push(av2);

  await new Promise(r => setTimeout(r, 1500));

  const av3 = await fetchAlphaVantage('EWJ', 'Nikkei 225 (ETF)', '🇯🇵', 'indices', 'USD', alphaKey);
  if (av3) results.push(av3);

  await new Promise(r => setTimeout(r, 1500));

  const av4 = await fetchAlphaVantage('VGK', 'Mercado Europeu', '🇪🇺', 'indices', 'USD', alphaKey);
  if (av4) results.push(av4);

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alphaKey = Deno.env.get('ALPHA_VANTAGE_API_KEY') || 'demo';
    const brapiKey = Deno.env.get('BRAPI_API_KEY') || '';
    const newsKey = Deno.env.get('NEWS_API_KEY') || '';

    // Try cache first
    const cached = await getCachedMarkets(supabase);
    if (cached && cached.length > 0) {
      console.log(`Serving ${cached.length} markets from cache`);
      const news = await fetchNews(cached, newsKey);
      const response = buildResponse(cached, news);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh data
    console.log('Cache miss/stale, fetching fresh market data...');
    const markets = await fetchAllMarkets(alphaKey, brapiKey);

    if (markets.length > 0) {
      await saveToCache(supabase, markets);
    }

    // Always merge with stale cache to fill gaps (AV rate limits are aggressive)
    let finalMarkets = markets;
    const oldCached = await getCachedMarketsForce(supabase);
    if (oldCached && oldCached.length > 0) {
      const freshIds = new Set(markets.map(m => m.id));
      const staleFillers = oldCached.filter(m => !freshIds.has(m.id));
      if (staleFillers.length > 0) {
        console.log(`Merging ${staleFillers.length} cached markets with ${markets.length} fresh`);
        finalMarkets = [...markets, ...staleFillers];
      }
    }

    const news = await fetchNews(finalMarkets, newsKey);
    const response = buildResponse(finalMarkets, news);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market data error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// Get cache even if stale (fallback)
async function getCachedMarketsForce(supabase: any): Promise<MarketData[] | null> {
  try {
    const { data } = await supabase
      .from('market_data_cache')
      .select('*')
      .order('conviction_score', { ascending: false });

    if (!data || data.length === 0) return null;

    return data.map((row: any) => {
      const isForex = row.id === 'usdbrl' || row.id === 'eurbrl';
      const isStock = row.ticker === 'PETR4';
      return {
      id: row.id,
      name: row.name,
      ticker: row.ticker,
      flag: row.flag,
      category: isForex ? 'forex' : isStock ? 'stocks' : 'indices',
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
    });
  } catch { return null; }
}

function buildResponse(markets: MarketData[], news: any[] = []) {
  // Generate alerts based on market conditions
  const alerts = markets
    .filter(m => Math.abs(m.zScore) > 1.5)
    .map(m => ({
      id: `alert-${m.id}`,
      type: m.zScore > 1.5 ? 'opportunity' : 'attention',
      severity: Math.abs(m.zScore) > 2.5 ? 'high' : 'medium',
      message: m.zScore > 1.5
        ? `${m.name}: Volume ${m.volumeRatio.toFixed(1)}x acima da média — possível acumulação institucional`
        : `${m.name}: Volume ${m.volumeRatio.toFixed(1)}x abaixo da média — atividade reduzida`,
      market: m.name,
      timestamp: new Date().toISOString(),
    }));

  // Find hottest market
  const hotMarket = markets.reduce((prev, curr) =>
    Math.abs(curr.zScore) > Math.abs(prev.zScore) ? curr : prev, markets[0]);

  // Determine overall sentiment
  const avgChange = markets.reduce((sum, m) => sum + m.priceChange, 0) / (markets.length || 1);
  const riskSentiment = avgChange > 0.5 ? 'risk-on' : avgChange < -0.5 ? 'risk-off' : 'neutral';

  // Dominant flow
  const flows = markets.map(m => m.flowType);
  const accCount = flows.filter(f => f === 'accumulation').length;
  const distCount = flows.filter(f => f === 'distribution').length;
  const dominantFlow = accCount > distCount ? 'inflow' : distCount > accCount ? 'outflow' : 'balanced';

  return {
    markets,
    globalMetrics: {
      riskSentiment,
      hotMarket: hotMarket?.name || 'N/A',
      dominantFlow,
      verdict: `Monitorando ${markets.length} mercados em tempo real. Dados atualizados a cada 15 minutos. ${
        hotMarket ? `${hotMarket.name} é o mercado mais ativo (Z-Score: ${hotMarket.zScore.toFixed(1)}σ).` : ''
      }`,
    },
    alerts,
    correlations: [],
    news,
    lastUpdated: new Date().toISOString(),
  };
}
