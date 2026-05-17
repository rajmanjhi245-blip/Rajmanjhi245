export const MARKET_SEGMENTS = [
  {
    id: 'india-equity',
    label: 'Indian Equities',
    venues: ['NSE Cash', 'NSE F&O', 'BSE Cash', 'Index Options'],
    assets: ['NIFTY 50', 'BANKNIFTY', 'RELIANCE', 'HDFCBANK', 'INFY'],
  },
  {
    id: 'crypto',
    label: 'Crypto',
    venues: ['Spot', 'Perpetual Futures', 'Options'],
    assets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'],
  },
  {
    id: 'forex',
    label: 'Forex',
    venues: ['Majors', 'Crosses', 'INR Pairs'],
    assets: ['USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY'],
  },
];

export const TIMEFRAMES = ['1m', '3m', '5m', '15m', '1h', '4h', '1D', '1W'];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round = (value, precision = 2) => Number(value.toFixed(precision));

export function seededNoise(seed, offset = 0) {
  const x = Math.sin(seed * 999 + offset * 131.17) * 10000;
  return x - Math.floor(x);
}

export function createMarketSnapshot({ symbol, segment, timeframe, seed = Date.now() / 60000 }) {
  const base = 100 + seededNoise(seed, 1) * 900;
  const volatility = 0.35 + seededNoise(seed, 2) * 3.6;
  const trend = (seededNoise(seed, 3) - 0.5) * 2;
  const institutionalFlow = (seededNoise(seed, 4) - 0.5) * 2;
  const optionsSkew = (seededNoise(seed, 5) - 0.5) * 2;
  const newsSentiment = (seededNoise(seed, 6) - 0.5) * 2;
  const liquidityScore = clamp(35 + seededNoise(seed, 7) * 65, 0, 100);
  const spreadRisk = clamp(100 - liquidityScore + volatility * 8, 0, 100);
  const atr = base * (volatility / 100);

  return {
    symbol,
    segment,
    timeframe,
    price: round(base + trend * atr * 4),
    atr: round(atr),
    volatility: round(volatility),
    trend: round(trend, 4),
    institutionalFlow: round(institutionalFlow, 4),
    optionsSkew: round(optionsSkew, 4),
    newsSentiment: round(newsSentiment, 4),
    liquidityScore: round(liquidityScore),
    spreadRisk: round(spreadRisk),
    updatedAt: new Date().toISOString(),
  };
}

export function analyzeSignal(snapshot, strategy = {}) {
  const weights = strategy.weights || {};
  const flowWeight = weights.flow ?? 0.34;
  const trendWeight = weights.trend ?? 0.28;
  const sentimentWeight = weights.sentiment ?? 0.2;
  const skewWeight = weights.skew ?? 0.18;
  const composite =
    snapshot.institutionalFlow * flowWeight +
    snapshot.trend * trendWeight +
    snapshot.newsSentiment * sentimentWeight +
    snapshot.optionsSkew * skewWeight;

  const qualityPenalty = snapshot.spreadRisk / 240 + Math.max(snapshot.volatility - 2.5, 0) / 12;
  const rawConfidence = Math.abs(composite) * 100 - qualityPenalty * 100 + snapshot.liquidityScore * 0.16;
  const confidence = round(clamp(rawConfidence, 0, 99));

  const minConfidence = strategy.minConfidence ?? 63;
  const minLiquidity = strategy.minLiquidity ?? 45;
  const maxSpreadRisk = strategy.maxSpreadRisk ?? 100;
  const action = confidence < minConfidence || snapshot.liquidityScore < minLiquidity || snapshot.spreadRisk > maxSpreadRisk
    ? 'WAIT'
    : composite > 0
      ? 'BUY'
      : 'SELL';

  const direction = action === 'BUY' ? 1 : action === 'SELL' ? -1 : 0;
  const stopDistance = Math.max(snapshot.atr * 1.35, snapshot.price * 0.004);
  const targetDistance = Math.max(snapshot.atr * 2.15, snapshot.price * 0.008);
  const entry = snapshot.price;

  return {
    symbol: snapshot.symbol,
    segment: snapshot.segment,
    timeframe: snapshot.timeframe,
    action,
    derivativeBias: action === 'BUY' ? 'CALL favored' : action === 'SELL' ? 'PUT favored' : 'No option trade',
    entry: round(entry),
    stopLoss: direction === 0 ? null : round(entry - direction * stopDistance),
    targets: direction === 0 ? [] : [
      round(entry + direction * targetDistance),
      round(entry + direction * targetDistance * 1.65),
      round(entry + direction * targetDistance * 2.35),
    ],
    confidence,
    compositeScore: round(composite, 4),
    riskGrade: gradeRisk(snapshot, confidence),
    rationale: buildRationale(snapshot, composite, action),
    updatedAt: snapshot.updatedAt,
  };
}

function gradeRisk(snapshot, confidence) {
  if (confidence >= 82 && snapshot.spreadRisk < 35 && snapshot.liquidityScore > 70) return 'A';
  if (confidence >= 70 && snapshot.spreadRisk < 55) return 'B';
  if (confidence >= 63) return 'C';
  return 'No-trade';
}

function buildRationale(snapshot, composite, action) {
  const drivers = [];
  drivers.push(snapshot.institutionalFlow >= 0 ? 'positive institutional flow' : 'negative institutional flow');
  drivers.push(snapshot.trend >= 0 ? 'upward price structure' : 'downward price structure');
  drivers.push(snapshot.newsSentiment >= 0 ? 'constructive sentiment' : 'defensive sentiment');
  if (snapshot.liquidityScore < 45) drivers.push('liquidity filter blocks execution');
  if (snapshot.spreadRisk > 65) drivers.push('spread risk is elevated');
  if (action === 'WAIT') drivers.push('signal quality is below execution threshold');
  return `Composite ${round(composite, 3)} from ${drivers.join(', ')}.`;
}

export function buildSignals({ segmentId = 'india-equity', timeframe = '15m', seed = Date.now() / 60000, strategy = {} } = {}) {
  const segment = MARKET_SEGMENTS.find((item) => item.id === segmentId) || MARKET_SEGMENTS[0];
  return segment.assets.map((symbol, index) => {
    const snapshot = createMarketSnapshot({
      symbol,
      segment: segment.label,
      timeframe,
      seed: seed + index * 17 + segment.id.length,
    });
    return analyzeSignal(snapshot, strategy);
  });
}

export function summarizeSignals(signals) {
  const counts = signals.reduce((acc, signal) => {
    acc[signal.action] = (acc[signal.action] || 0) + 1;
    return acc;
  }, { BUY: 0, SELL: 0, WAIT: 0 });
  const avgConfidence = signals.length
    ? round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
    : 0;
  return { ...counts, avgConfidence };
}
