import { buildTradingSignals, calculateIndicators } from './alertEngine.js';
import { generateSyntheticCandles } from './marketStructureEngine.js';
import { MARKET_SEGMENTS, round, seededNoise } from './signalEngine.js';

const SECTORS = ['Banking', 'IT', 'Pharma', 'Energy', 'Auto', 'FMCG', 'Metals', 'Realty'];
const CURATED_SCREENS = [
  { id: 'momentum-breakout', name: 'Momentum Breakout', description: 'Price strength + volume expansion + bullish MACD.' },
  { id: 'value-quality', name: 'Value Quality', description: 'Low valuation with high ROE and stable earnings.' },
  { id: 'near-52w-high', name: 'Near 52W High', description: 'Stocks within 3% of synthetic yearly highs.' },
  { id: 'cash-rich-smallcaps', name: 'Cash Rich Smallcaps', description: 'Smaller companies with strong cash and low debt.' },
  { id: 'oversold-reversal', name: 'Oversold Reversal', description: 'RSI recovery candidates with positive structure.' },
];

export function buildResearchDashboard({ segmentId = 'india-equity', timeframe = '15m', seed = 245, strategy = {} } = {}) {
  const signals = buildTradingSignals({ segmentId, timeframe, seed, strategy });
  const enriched = signals.map((signal, index) => enrichEquity(signal, seed + index));
  const sectors = buildSectorRotation({ seed });
  return {
    marketMood: buildMarketMood(enriched, seed),
    sectors,
    todaysStocks: {
      gainers: rankBy(enriched, 'changePct', 'desc').slice(0, 5),
      losers: rankBy(enriched, 'changePct', 'asc').slice(0, 5),
      mostActive: rankBy(enriched, 'volume', 'desc').slice(0, 5),
      nearHigh: enriched.filter((stock) => stock.distanceFromHigh <= 3).slice(0, 5),
      nearLow: enriched.filter((stock) => stock.distanceFromLow <= 3).slice(0, 5),
    },
    curatedScreens: CURATED_SCREENS.map((screen) => ({ ...screen, matches: runStockScreener({ screenId: screen.id, segmentId, timeframe, seed, strategy }).slice(0, 5) })),
    events: buildEvents(seed),
  };
}

export function runStockScreener({ screenId = 'momentum-breakout', segmentId = 'india-equity', timeframe = '15m', seed = 245, strategy = {}, filters = {} } = {}) {
  const stocks = buildTradingSignals({ segmentId, timeframe, seed, strategy }).map((signal, index) => enrichEquity(signal, seed + index));
  return stocks
    .filter((stock) => passesScreen(stock, screenId))
    .filter((stock) => applyCustomFilters(stock, filters))
    .sort((a, b) => b.score - a.score);
}

export function buildCompanyAnalysis({ symbol = 'RELIANCE', segmentId = 'india-equity', timeframe = '1D', seed = 245, strategy = {} } = {}) {
  const signals = buildTradingSignals({ segmentId, timeframe, seed, strategy });
  const baseSignal = signals.find((signal) => signal.symbol.toUpperCase() === symbol.toUpperCase()) || signals[0];
  const stock = enrichEquity(baseSignal, seed + symbol.length);
  const financials = Array.from({ length: 5 }, (_, index) => ({
    year: 2022 + index,
    revenue: round(stock.marketCap * (0.18 + seededNoise(seed, index) * 0.07)),
    profit: round(stock.marketCap * (0.018 + seededNoise(seed, index + 5) * 0.018)),
    debtToEquity: round(stock.debtToEquity * (0.86 + seededNoise(seed, index + 10) * 0.26), 2),
  }));
  return {
    stock,
    scores: {
      valuation: scoreRange(35 - stock.pe, 0, 35),
      quality: scoreRange(stock.roe, 0, 30),
      momentum: scoreRange(stock.changePct + 8, 0, 16),
      technical: stock.confidence,
    },
    financials,
    shareholding: buildShareholding(seed),
    peers: signals.filter((signal) => signal.symbol !== baseSignal.symbol).slice(0, 4).map((signal, index) => enrichEquity(signal, seed + index + 20)),
    notes: [
      `${stock.symbol} has ${stock.indicators.trendConfluence} trend confluence and ${stock.indicators.rsiBias} RSI bias.`,
      `Synthetic ROE ${stock.roe}% and P/E ${stock.pe} are used for deterministic research only.`,
    ],
  };
}

export function buildOptionsAnalytics({ symbol = 'NIFTY 50', seed = 245, spot = 23600 } = {}) {
  const baseSpot = Number(spot) || 23600;
  const step = baseSpot > 1000 ? 100 : 10;
  const atm = Math.round(baseSpot / step) * step;
  const strikes = Array.from({ length: 11 }, (_, index) => atm + (index - 5) * step);
  const chain = strikes.map((strike, index) => optionRow({ strike, spot: baseSpot, seed: seed + index }));
  const totalCallOi = chain.reduce((sum, row) => sum + row.call.oi, 0);
  const totalPutOi = chain.reduce((sum, row) => sum + row.put.oi, 0);
  const maxPain = chain.reduce((best, row) => row.pain < best.pain ? row : best, chain[0]);
  const atmRow = chain.reduce((best, row) => Math.abs(row.strike - baseSpot) < Math.abs(best.strike - baseSpot) ? row : best, chain[0]);
  return {
    symbol,
    spot: round(baseSpot),
    pcr: round(totalPutOi / totalCallOi, 2),
    maxPain: maxPain.strike,
    atmStraddle: round(atmRow.call.ltp + atmRow.put.ltp),
    ivSkew: round(chain.at(-1).call.iv - chain[0].put.iv, 2),
    chain,
  };
}

export function buildSectorRotation({ seed = 245 } = {}) {
  return SECTORS.map((sector, index) => {
    const momentum = round((seededNoise(seed, index) - 0.5) * 20, 2);
    const relativeStrength = round((seededNoise(seed, index + 20) - 0.5) * 20, 2);
    return {
      sector,
      momentum,
      relativeStrength,
      quadrant: relativeStrength >= 0 && momentum >= 0 ? 'Leading' : relativeStrength >= 0 ? 'Weakening' : momentum >= 0 ? 'Improving' : 'Lagging',
      breadth: round(35 + seededNoise(seed, index + 40) * 60),
    };
  });
}

export function buildPlatformFeatureMatrix() {
  return [
    { source: 'Stockmock-style', implemented: ['options backtest report', 'multi-leg strategy simulator scaffold', 'slippage/brokerage assumptions'] },
    { source: 'Tickertape-style', implemented: ['market mood', 'sector snapshot', 'curated screens', 'events feed'] },
    { source: 'Chartink-style', implemented: ['no-code screener presets', 'indicator filters', 'timeframe-aware scans'] },
    { source: 'ScanX/StockEdge-style', implemented: ['community screen concepts', 'sector rotation', 'technical/fundamental profile cards'] },
    { source: 'Screener-style', implemented: ['company fundamentals', 'financial history', 'shareholding and peers'] },
    { source: 'StockMojo-style', implemented: ['option chain', 'PCR', 'max pain', 'straddle premium', 'IV skew'] },
  ];
}

function enrichEquity(signal, seed) {
  const candles = generateSyntheticCandles({ seed: signal.sourceSeed || seed, basePrice: signal.entry, bars: 80, volatility: Math.max(0.7, signal.confidence / 35) });
  const indicators = signal.indicators || calculateIndicators(candles);
  const changePct = round((seededNoise(seed, 2) - 0.5) * 12, 2);
  const high52 = round(signal.entry * (1 + seededNoise(seed, 3) * 0.22));
  const low52 = round(signal.entry * (0.72 + seededNoise(seed, 4) * 0.18));
  const marketCap = round(2500 + seededNoise(seed, 5) * 250000);
  const pe = round(8 + seededNoise(seed, 6) * 45, 2);
  const roe = round(4 + seededNoise(seed, 7) * 28, 2);
  const debtToEquity = round(seededNoise(seed, 8) * 2.4, 2);
  return {
    ...signal,
    changePct,
    volume: round(100000 + seededNoise(seed, 9) * 5000000),
    high52,
    low52,
    distanceFromHigh: round(((high52 - signal.entry) / high52) * 100, 2),
    distanceFromLow: round(((signal.entry - low52) / low52) * 100, 2),
    marketCap,
    pe,
    roe,
    debtToEquity,
    dividendYield: round(seededNoise(seed, 10) * 3.5, 2),
    score: round(signal.confidence * 0.45 + roe * 0.9 - pe * 0.25 + changePct * 1.8 - debtToEquity * 4),
    indicators,
  };
}

function passesScreen(stock, screenId) {
  if (screenId === 'momentum-breakout') return stock.changePct > 1 && stock.indicators.macdBias === 'bullish';
  if (screenId === 'value-quality') return stock.pe < 25 && stock.roe > 14 && stock.debtToEquity < 1.2;
  if (screenId === 'near-52w-high') return stock.distanceFromHigh <= 5;
  if (screenId === 'cash-rich-smallcaps') return stock.marketCap < 60000 && stock.debtToEquity < 0.8;
  if (screenId === 'oversold-reversal') return stock.indicators.rsi < 45 && stock.changePct > -2;
  return true;
}

function applyCustomFilters(stock, filters) {
  if (filters.minRoe && stock.roe < Number(filters.minRoe)) return false;
  if (filters.maxPe && stock.pe > Number(filters.maxPe)) return false;
  if (filters.minConfidence && stock.confidence < Number(filters.minConfidence)) return false;
  if (filters.action && stock.action !== filters.action) return false;
  return true;
}

function buildMarketMood(stocks, seed) {
  const avgChange = stocks.length ? stocks.reduce((sum, stock) => sum + stock.changePct, 0) / stocks.length : 0;
  const breadth = round(stocks.filter((stock) => stock.changePct >= 0).length / Math.max(stocks.length, 1) * 100);
  const score = round(50 + avgChange * 5 + (breadth - 50) * 0.4 + (seededNoise(seed, 30) - 0.5) * 8);
  return { score, label: score >= 65 ? 'Greed' : score <= 35 ? 'Fear' : 'Neutral', breadth, avgChange: round(avgChange, 2) };
}

function buildEvents(seed) {
  return ['Quarterly result', 'Dividend ex-date', 'Bulk deal', 'Analyst meet', 'Corporate action'].map((type, index) => ({
    type,
    symbol: ['RELIANCE', 'INFY', 'HDFCBANK', 'TCS', 'BANKNIFTY'][index],
    impact: seededNoise(seed, index) > 0.55 ? 'High' : 'Medium',
    dueInDays: index + 1,
  }));
}

function optionRow({ strike, spot, seed }) {
  const distance = Math.abs(strike - spot);
  const intrinsicCall = Math.max(spot - strike, 0);
  const intrinsicPut = Math.max(strike - spot, 0);
  const timeValue = Math.max(8, spot * 0.012 * Math.exp(-distance / Math.max(spot * 0.08, 1)));
  const callOi = round(50000 + seededNoise(seed, 11) * 900000);
  const putOi = round(50000 + seededNoise(seed, 12) * 900000);
  return {
    strike,
    call: { ltp: round(intrinsicCall + timeValue), iv: round(10 + seededNoise(seed, 13) * 25, 2), oi: callOi, delta: round(Math.max(0.05, Math.min(0.95, 0.5 + (spot - strike) / (spot * 0.08))), 2) },
    put: { ltp: round(intrinsicPut + timeValue), iv: round(10 + seededNoise(seed, 14) * 25, 2), oi: putOi, delta: round(-Math.max(0.05, Math.min(0.95, 0.5 + (strike - spot) / (spot * 0.08))), 2) },
    pain: round(callOi * Math.max(spot - strike, 0) + putOi * Math.max(strike - spot, 0)),
  };
}

function rankBy(items, key, direction = 'desc') {
  return [...items].sort((a, b) => direction === 'desc' ? b[key] - a[key] : a[key] - b[key]);
}

function scoreRange(value, min, max) {
  return round(Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)));
}

function buildShareholding(seed) {
  const promoter = round(35 + seededNoise(seed, 31) * 35, 2);
  const fii = round(8 + seededNoise(seed, 32) * 25, 2);
  const dii = round(5 + seededNoise(seed, 33) * 20, 2);
  return { promoter, fii, dii, public: round(Math.max(0, 100 - promoter - fii - dii), 2) };
}
