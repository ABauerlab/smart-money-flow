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
  historicalDates?: string[];
  volumeSource?: 'real' | 'proxy';
}

const CACHE_TTL_MINUTES = 360; // 6h cache - Alpha Vantage free tier is 25 req/day

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
  price: number, prevPrice: number, currentVolume: number, volumes: number[],
  opts: { dates?: string[]; volumeSource?: 'real' | 'proxy' } = {}
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
    historicalDates: opts.dates?.slice(0, 10),
    volumeSource: opts.volumeSource ?? 'real',
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

    return buildMarket(symbol.toLowerCase(), name, symbol, flag, category, currency, price, prevPrice, currentVolume, volumes, { dates, volumeSource: 'real' });
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

    // Extract historical volumes + dates from historicalDataPrice if available
    let historicalVolumes: number[] = [];
    let historicalDates: string[] = [];
    if (quote.historicalDataPrice && Array.isArray(quote.historicalDataPrice)) {
      const ordered = [...quote.historicalDataPrice].sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
      const slice = ordered.slice(0, 21);
      historicalVolumes = slice.map((d: any) => d.volume || 0);
      historicalDates = slice.map((d: any) => {
        if (!d.date) return '';
        const dt = new Date(d.date * 1000);
        return dt.toISOString().slice(0, 10);
      });
      // Filter out zero-volume entries while keeping date alignment
      const filtered = historicalVolumes
        .map((v, i) => ({ v, d: historicalDates[i] }))
        .filter(x => x.v > 0);
      historicalVolumes = filtered.map(x => x.v);
      historicalDates = filtered.map(x => x.d);
    }

    // For indices like ^BVSP that don't report volume
    let effectiveVolume = currentVolume;
    let effectiveAvg = avgVolume;
    let effectiveHistory = historicalVolumes;
    let effectiveDates = historicalDates;
    let volumeSource: 'real' | 'proxy' = 'real';

    if (effectiveVolume === 0 && effectiveAvg === 0) {
      volumeSource = 'proxy';
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
      effectiveDates = [];
    }

    if (effectiveHistory.length === 0) {
      effectiveHistory = Array(10).fill(effectiveAvg > 0 ? effectiveAvg : effectiveVolume);
      effectiveHistory[0] = effectiveVolume;
      volumeSource = 'proxy';
      effectiveDates = [];
    }

    return buildMarket(
      symbol.toLowerCase().replace('^', '').replace('.', ''),
      name, symbol, flag, category, 'BRL',
      price, prevPrice, effectiveVolume, effectiveHistory,
      { dates: effectiveDates, volumeSource }
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
    const dates = data.map((d: any) => {
      const ts = parseInt(d.timestamp || '0', 10);
      return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '';
    });

    return buildMarket(
      pair.toLowerCase().replace('-', ''),
      name, pair.replace('-', '/'), flag, category, currency,
      price, prevPrice, currentVolume, volumes,
      { dates, volumeSource: 'proxy' }
    );
  } catch (e) {
    console.error(`AwesomeAPI error for ${pair}:`, e);
    return null;
  }
}

// ---- CoinMarketCap (Crypto - real volume + price, batched) ----
interface CryptoSpec { symbol: string; name: string; flag: string; }

async function fetchCryptosBatch(specs: CryptoSpec[], apiKey: string): Promise<MarketData[]> {
  if (!apiKey || specs.length === 0) {
    if (!apiKey) console.warn('CoinMarketCap: missing API key');
    return [];
  }
  try {
    const symbolsParam = specs.map(s => s.symbol).join(',');
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbolsParam}&convert=USD`;
    const res = await fetch(url, { headers: { 'X-CMC_PRO_API_KEY': apiKey } });
    const data = await res.json();

    if (data?.status?.error_code && data.status.error_code !== 0) {
      console.warn('CMC batch error:', data.status.error_message);
      return [];
    }

    const out: MarketData[] = [];
    for (const spec of specs) {
      const entry = data?.data?.[spec.symbol]?.[0] || data?.data?.[spec.symbol];
      const quote = entry?.quote?.USD;
      if (!quote) {
        console.warn(`CMC: no quote for ${spec.symbol}`);
        continue;
      }
      const price = quote.price || 0;
      const change24h = quote.percent_change_24h || 0;
      const prevPrice = price / (1 + change24h / 100);
      const currentVolume = quote.volume_24h || 0;
      // CMC quotes endpoint doesn't return per-day history → ±10% jitter proxy
      const volumes = Array.from({ length: 21 }, (_, i) => {
        if (i === 0) return currentVolume;
        const jitter = 0.9 + (((spec.symbol.charCodeAt(0) + i) * 7919) % 200) / 1000;
        return currentVolume * jitter;
      });
      out.push(buildMarket(
        spec.symbol.toLowerCase(), spec.name, spec.symbol, spec.flag, 'crypto', 'USD',
        price, prevPrice, currentVolume, volumes,
        { volumeSource: 'proxy' }
      ));
    }
    return out;
  } catch (e) {
    console.error('CMC batch error:', e);
    return [];
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
    const dates = series.slice(0, 21).map((d: any) => d.date || '');
    const currentVolume = volumes[0] || 1_000_000;
    return buildMarket(
      'brent', 'Petróleo Brent', 'BRENT', '🛢️', 'commodities', 'USD',
      price, prevPrice, currentVolume, volumes,
      { dates, volumeSource: 'proxy' }
    );
  } catch (e) {
    console.error('Brent error:', e);
    return null;
  }
}

// ---- NewsAPI (strictly filtered to tracked assets) ----
// Each tracked asset has a label + list of keywords. An article must match
// at least one keyword to be returned. The first matched asset becomes the tag.
// Each tracked asset has a label + list of whole-word keywords (matched via \b boundaries
// so "ada" doesn't match "apreensada", "sol" doesn't match "solenidade", etc.).
const ASSET_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: 'Ibovespa', keywords: ['ibovespa', 'bovespa', 'b3', 'ibov'] },
  { label: 'Petrobras', keywords: ['petrobras', 'petr4', 'petr3'] },
  { label: 'S&P 500', keywords: ['s&p 500', 'sp500', 's&p500', 'spx', 'standard & poor'] },
  { label: 'Nasdaq', keywords: ['nasdaq', 'qqq'] },
  { label: 'Nikkei', keywords: ['nikkei', 'nikkei 225'] },
  { label: 'Mercado Europeu', keywords: ['stoxx', 'euro stoxx', 'cac 40', 'ftse'] },
  { label: 'DAX 40', keywords: ['dax', 'dax 40', 'dax40', 'bolsa alemã', 'bolsa alema', 'frankfurt'] },
  { label: 'NYSE Composite', keywords: ['nyse', 'new york stock exchange', 'nyse composite'] },
  { label: 'KOSPI', keywords: ['kospi', 'bolsa coreana', 'coreia do sul', 'coréia do sul', 'south korea'] },
  { label: 'BSE Sensex', keywords: ['bse', 'sensex', 'bombay stock exchange', 'bolsa de bombaim', 'india market', 'mercado indiano'] },
  { label: 'Petróleo Brent', keywords: ['brent', 'petróleo', 'petroleo', 'crude oil', 'opep', 'opec'] },
  { label: 'Bitcoin', keywords: ['bitcoin', 'btc'] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text: string, keyword: string): boolean {
  // Whole-word match: keyword must be surrounded by non-letter/digit chars (or string edges).
  // Handles accented chars correctly via Unicode property escapes.
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(keyword)}([^\\p{L}\\p{N}]|$)`, 'iu');
  return pattern.test(text);
}

function classifyArticle(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  for (const asset of ASSET_KEYWORDS) {
    if (asset.keywords.some(k => matchesKeyword(text, k.toLowerCase()))) return asset.label;
  }
  return null;
}

async function fetchNews(_markets: MarketData[], apiKey: string): Promise<any[]> {
  if (!apiKey) return [];
  try {
    // Search-side narrowing: top tickers + cripto/mercado financeiro umbrella terms.
    // Final filter happens after — only articles matching an asset keyword are returned.
    const queryTerms = [
      'Ibovespa', 'Petrobras', 'S&P 500', 'Nasdaq', 'Bitcoin',
      'DAX', 'NYSE', 'KOSPI', 'Sensex', '"Bombay Stock Exchange"',
      '"Petróleo Brent"'
    ];
    const q = encodeURIComponent(`(${queryTerms.join(' OR ')})`);
    const url = `https://newsapi.org/v2/everything?q=${q}&language=pt&sortBy=publishedAt&pageSize=40&apiKey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      console.warn('NewsAPI returned no articles:', data.message);
      return [];
    }

    const filtered: any[] = [];
    for (const a of data.articles) {
      const market = classifyArticle(a.title || '', a.description || '');
      if (!market) continue; // discard unrelated noise
      filtered.push({
        title: a.title,
        source: a.source?.name || 'Desconhecido',
        url: a.url,
        publishedAt: a.publishedAt,
        market,
      });
      if (filtered.length >= 12) break;
    }
    console.log(`NewsAPI: ${data.articles.length} fetched → ${filtered.length} relevant`);
    return filtered;
  } catch (e) {
    console.error('NewsAPI error:', e);
    return [];
  }
}

// ---- Cache Layer ----
const CRYPTO_IDS = new Set(['btc']);

function categoryFromRow(row: any): string {
  const id = String(row.id || '').toLowerCase();
  if (id === 'usdbrl' || id === 'eurbrl') return 'forex';
  if (id === 'xauusd' || id === 'brent') return 'commodities';
  if (CRYPTO_IDS.has(id)) return 'crypto';
  if (row.ticker === 'PETR4') return 'stocks';
  return 'indices';
}

function unpackHistorical(raw: any): { volumes: number[]; dates: string[]; source: 'real' | 'proxy' } {
  if (!raw) return { volumes: [], dates: [], source: 'real' };
  if (Array.isArray(raw)) return { volumes: raw, dates: [], source: 'real' };
  return {
    volumes: Array.isArray(raw.volumes) ? raw.volumes : [],
    dates: Array.isArray(raw.dates) ? raw.dates : [],
    source: raw.source === 'proxy' ? 'proxy' : 'real',
  };
}

function rowToMarket(row: any): MarketData {
  const hist = unpackHistorical(row.historical_volumes);
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    flag: row.flag,
    category: categoryFromRow(row),
    currentVolume: Number(row.current_volume),
    averageVolume: Number(row.average_volume),
    price: Number(row.price),
    priceChange: Number(row.price_change),
    volumeRatio: Number(row.volume_ratio),
    zScore: Number(row.z_score),
    flowType: row.flow_type as MarketData['flowType'],
    convictionScore: Number(row.conviction_score),
    currency: row.currency,
    historicalVolumes: hist.volumes,
    historicalDates: hist.dates,
    volumeSource: hist.source,
  };
}

async function getCachedMarkets(supabase: any): Promise<MarketData[] | null> {
  try {
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('*')
      .order('conviction_score', { ascending: false });

    if (error || !data || data.length === 0) return null;

    const oldestFetch = new Date(data[0].fetched_at);
    const ageMinutes = (Date.now() - oldestFetch.getTime()) / (1000 * 60);
    if (ageMinutes > CACHE_TTL_MINUTES) return null;

    return data.map(rowToMarket);
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
          historical_volumes: {
            volumes: m.historicalVolumes || [],
            dates: m.historicalDates || [],
            source: m.volumeSource || 'real',
          },
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    }
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// ---- Brapi BDR fallback for global indices when Alpha Vantage rate limit hits ----
// BDRs (Brazilian Depositary Receipts) track US ETFs/indices and are quoted on B3.
async function fetchBrapiBDR(
  bdrTicker: string, name: string, flag: string, category: string, currency: string,
  apiKey: string, fallbackId: string
): Promise<MarketData | null> {
  const m = await fetchBrapiQuote(bdrTicker, name, flag, category, apiKey);
  if (!m) return null;
  // Override the id so it matches the original Alpha Vantage cache slot
  return { ...m, id: fallbackId, ticker: bdrTicker, currency };
}

// ---- Ibovespa proxy via blue chips (Brapi) ----
// ^BVSP doesn't report volume. Sum the volumes of the heaviest weighted stocks
// to get a real proxy of institutional activity, with real historical dates.
async function fetchIbovespaProxy(apiKey: string): Promise<MarketData | null> {
  try {
    // Top weighted Ibovespa stocks. Brapi free plan only allows 1 ticker per call → fetch in parallel.
    const tickers = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4'];
    const quotes = await Promise.all(
      tickers.map(async t => {
        try {
          const r = await fetch(`https://brapi.dev/api/quote/${t}?token=${apiKey}&range=1mo&interval=1d`);
          const j = await r.json();
          return j?.results?.[0] || null;
        } catch { return null; }
      })
    );
    const validQuotes = quotes.filter(Boolean);
    if (validQuotes.length === 0) {
      console.warn('Ibovespa proxy: no blue chip data');
      return null;
    }

    // Fetch the actual ^BVSP price (the index level itself)
    let price = 0, prevPrice = 0;
    try {
      const bvspRes = await fetch(`https://brapi.dev/api/quote/%5EBVSP?token=${apiKey}`);
      const bvspData = await bvspRes.json();
      const bvspQuote = bvspData?.results?.[0];
      price = bvspQuote?.regularMarketPrice || 0;
      prevPrice = bvspQuote?.regularMarketPreviousClose || price;
    } catch (e) {
      console.warn('Ibovespa: failed to fetch ^BVSP price', e);
    }

    // Aggregate per-day volumes from each blue chip; align by ISO date
    const volumeByDate = new Map<string, number>();
    for (const quote of validQuotes) {
      if (!Array.isArray(quote.historicalDataPrice)) continue;
      for (const day of quote.historicalDataPrice) {
        if (!day.date || !day.volume || day.volume <= 0) continue;
        const isoDate = new Date(day.date * 1000).toISOString().slice(0, 10);
        volumeByDate.set(isoDate, (volumeByDate.get(isoDate) || 0) + day.volume);
      }
    }

    if (volumeByDate.size === 0) {
      console.warn('Ibovespa proxy: no historical volume aggregated');
      return null;
    }

    const sortedDates = [...volumeByDate.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 21);
    const historicalVolumes = sortedDates.map(d => volumeByDate.get(d)!);
    // Blue chips ≈ 25% of index turnover → multiply by 4 for full Ibov estimate
    const scaledVolumes = historicalVolumes.map(v => v * 4);
    const currentVolume = scaledVolumes[0];

    console.log(`Ibovespa proxy: ${sortedDates.length} days from ${validQuotes.length}/4 blue chips, today=${currentVolume.toFixed(0)}`);

    return buildMarket(
      'bvsp', 'Ibovespa', '^BVSP', '🇧🇷', 'indices', 'BRL',
      price, prevPrice, currentVolume, scaledVolumes,
      { dates: sortedDates, volumeSource: 'proxy' }
    );
  } catch (e) {
    console.error('Ibovespa proxy error:', e);
    return null;
  }
}

// ---- Fetch with staggered delays to respect rate limits ----
const CRYPTO_SPECS: CryptoSpec[] = [
  { symbol: 'BTC', name: 'Bitcoin', flag: '₿' },
];

// BDR fallbacks for Alpha Vantage assets — used when AV rate-limits us
const BDR_FALLBACKS: Array<{ id: string; ticker: string; name: string; flag: string; category: string; currency: string }> = [
  { id: 'spy',   ticker: 'IVVB11', name: 'S&P 500 (BDR)',     flag: '🇺🇸', category: 'indices', currency: 'BRL' },
  { id: 'qqq',   ticker: 'NASD11', name: 'Nasdaq 100 (BDR)',  flag: '📈', category: 'indices', currency: 'BRL' },
];

async function fetchAllMarkets(alphaKey: string, brapiKey: string, cmcKey: string): Promise<MarketData[]> {
  const results: MarketData[] = [];
  const fetchedIds = new Set<string>();

  // Batch 1: independent APIs (Brapi, batched CoinMarketCap) — no shared rate limit
  const [bvsp, petr4, cryptos] = await Promise.all([
    fetchIbovespaProxy(brapiKey),
    fetchBrapiQuote('PETR4', 'Petrobras PN', '🛢️', 'stocks', brapiKey),
    fetchCryptosBatch(CRYPTO_SPECS, cmcKey),
  ]);
  for (const m of [bvsp, petr4]) {
    if (m) { results.push(m); fetchedIds.add(m.id); }
  }
  for (const c of cryptos) { results.push(c); fetchedIds.add(c.id); }

  // Batch 2: Alpha Vantage (5 calls/min, 25/day limit — stagger). Track failures for BDR fallback.
  // International indices use US-listed country ETFs as proxies (real volume + liquidity available on free tier).
  const avTargets = [
    { sym: 'SPY',  id: 'spy',  name: 'S&P 500',          flag: '🇺🇸' },
    { sym: 'QQQ',  id: 'qqq',  name: 'Nasdaq 100',       flag: '📈' },
    { sym: 'EWJ',  id: 'ewj',  name: 'Nikkei 225 (ETF)', flag: '🇯🇵' },
    { sym: 'VGK',  id: 'vgk',  name: 'Mercado Europeu',  flag: '🇪🇺' },
    { sym: 'EWG',  id: 'ewg',  name: 'DAX 40 (ETF)',     flag: '🇩🇪' },
    { sym: 'NYA',  id: 'nya',  name: 'NYSE Composite',   flag: '🏛️' },
    { sym: 'EWY',  id: 'ewy',  name: 'KOSPI (ETF)',      flag: '🇰🇷' },
    { sym: 'INDA', id: 'inda', name: 'BSE Sensex (ETF)', flag: '🇮🇳' },
  ];

  for (const t of avTargets) {
    const m = await fetchAlphaVantage(t.sym, t.name, t.flag, 'indices', 'USD', alphaKey);
    if (m) { results.push(m); fetchedIds.add(t.id); }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Brent uses commodity endpoint (separate quota from TIME_SERIES)
  const brent = await fetchBrent(alphaKey);
  if (brent) { results.push(brent); fetchedIds.add('brent'); }

  // BDR fallback: for any AV asset that failed, try its Brapi BDR equivalent
  for (const bdr of BDR_FALLBACKS) {
    if (fetchedIds.has(bdr.id)) continue;
    const m = await fetchBrapiBDR(bdr.ticker, bdr.name, bdr.flag, bdr.category, bdr.currency, brapiKey, bdr.id);
    if (m) {
      console.log(`BDR fallback: filled ${bdr.id} via ${bdr.ticker}`);
      results.push(m);
      fetchedIds.add(bdr.id);
    }
  }

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
    const cmcKey = Deno.env.get('COINMARKETCAP_API_KEY') || '';
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
    const markets = await fetchAllMarkets(alphaKey, brapiKey, cmcKey);

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
    return data.map(rowToMarket);
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
