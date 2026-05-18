import { buildSignals, MARKET_SEGMENTS, round } from './signalEngine.js';
import { generateSyntheticCandles, analyzeMarketStructure } from './marketStructureEngine.js';
import { buildStrategy } from './strategyEngine.js';

export function calculateIndicators(candles) {
  const closes = candles.map((bar) => bar.close);
  const rsi = calculateRsi(closes);
  const macd = calculateMacd(closes);
  const emaFast = calculateEma(closes, 9).at(-1) || closes.at(-1);
  const emaSlow = calculateEma(closes, 21).at(-1) || closes.at(-1);
  const trendConfluence = emaFast > emaSlow ? 'bullish' : emaFast < emaSlow ? 'bearish' : 'neutral';
  const rsiBias = rsi >= 58 ? 'bullish' : rsi <= 42 ? 'bearish' : 'neutral';
  const macdBias = macd.histogram > 0 ? 'bullish' : macd.histogram < 0 ? 'bearish' : 'neutral';

  return {
    rsi,
    rsiBias,
    macd,
    macdBias,
    trendConfluence,
    emaFast: round(emaFast),
    emaSlow: round(emaSlow),
  };
}

export function buildTradingSignals({ segmentId = 'india-equity', timeframe = '15m', seed = 245, strategy = {} } = {}) {
  const builtStrategy = buildStrategy(strategy);
  return buildSignals({ segmentId, timeframe, seed, strategy: builtStrategy }).map((signal) => {
    const candles = generateSyntheticCandles({
      seed: signal.sourceSeed,
      basePrice: signal.entry,
      volatility: Math.max(0.7, signal.confidence / 35),
      bars: 80,
    });
    const indicators = calculateIndicators(candles);
    const structure = analyzeMarketStructure({
      seed: signal.sourceSeed,
      basePrice: signal.entry,
      volatility: Math.max(0.7, signal.confidence / 35),
      bars: 80,
    });
    const setupTags = classifySetup({ signal, indicators, structure });
    return {
      id: `${segmentId}:${signal.symbol}:${timeframe}:${Math.round(seed)}:${signal.sourceSeed}`,
      ...signal,
      indicators,
      structure,
      structureSummary: structure.summary,
      setupTags,
      alertType: signal.action === 'WAIT' ? 'FILTERED' : 'TRADING_SIGNAL',
    };
  });
}

export function buildAlertHistory({ segmentId = 'india-equity', timeframe = '15m', seed = 245, strategy = {}, periods = 36 } = {}) {
  const history = [];
  for (let offset = periods; offset >= 1; offset -= 1) {
    const signals = buildTradingSignals({ segmentId, timeframe, seed: Number(seed) - offset, strategy });
    for (const signal of signals.filter((item) => item.action !== 'WAIT')) {
      history.push(resolveAlertOutcome(signal, Number(seed) - offset));
    }
  }
  return history.slice(-80);
}

export function resolveAlertOutcome(signal, seed) {
  const direction = signal.action === 'BUY' ? 1 : -1;
  const setupBonus = signal.setupTags.length * 0.035;
  const predictedProbability = round(Math.min(0.95, Math.max(0.05, signal.confidence / 100 + setupBonus)), 3);
  const deterministicOutcome = Math.sin((seed + signal.sourceSeed) * 12.9898) * 43758.5453;
  const outcomeScore = deterministicOutcome - Math.floor(deterministicOutcome);
  const won = outcomeScore <= predictedProbability;
  const rMultiple = won ? round(1 + signal.confidence / 140, 2) : round(-1 + signal.confidence / 500, 2);
  const exit = signal.entry + direction * Math.abs(signal.entry - (signal.stopLoss || signal.entry * 0.995)) * rMultiple;

  return {
    id: signal.id,
    symbol: signal.symbol,
    segment: signal.segment,
    timeframe: signal.timeframe,
    action: signal.action,
    entry: signal.entry,
    exit: round(exit),
    confidence: signal.confidence,
    predictedProbability,
    outcome: won ? 'WIN' : 'LOSS',
    rMultiple,
    setupTags: signal.setupTags,
    indicators: signal.indicators,
    openedAt: new Date(Date.now() - Math.abs(seed % 1000) * 60000).toISOString(),
  };
}

export function buildAccuracyBacktest(alerts) {
  const completed = alerts.filter((alert) => alert.outcome === 'WIN' || alert.outcome === 'LOSS');
  const setupNames = ['RSI', 'MACD', 'Trend Confluence', 'Liquidity Sweep', 'Break of Structure', 'Real Breakout', 'Real FVG'];
  const bySetup = setupNames.map((setup) => summarizeAlerts(
    completed.filter((alert) => alert.setupTags.includes(setup)),
    setup,
  ));
  const byConfidenceBucket = [
    ['0-50%', 0, 50],
    ['50-65%', 50, 65],
    ['65-80%', 65, 80],
    ['80-99%', 80, 99],
  ].map(([label, min, max]) => summarizeAlerts(
    completed.filter((alert) => alert.confidence >= min && alert.confidence < max),
    label,
  ));

  return {
    totalAlerts: completed.length,
    overall: summarizeAlerts(completed, 'Overall'),
    bySetup,
    byConfidenceBucket,
  };
}

function classifySetup({ signal, indicators, structure }) {
  const tags = [];
  if ((signal.action === 'BUY' && indicators.rsiBias === 'bullish') || (signal.action === 'SELL' && indicators.rsiBias === 'bearish')) tags.push('RSI');
  if ((signal.action === 'BUY' && indicators.macdBias === 'bullish') || (signal.action === 'SELL' && indicators.macdBias === 'bearish')) tags.push('MACD');
  if ((signal.action === 'BUY' && indicators.trendConfluence === 'bullish') || (signal.action === 'SELL' && indicators.trendConfluence === 'bearish')) tags.push('Trend Confluence');
  if (structure.liquiditySweep.detected) tags.push('Liquidity Sweep');
  if (structure.breakOfStructure.detected) tags.push('Break of Structure');
  if (structure.breakout.type === 'real') tags.push('Real Breakout');
  if (structure.latestFvg?.status === 'active') tags.push('Real FVG');
  return tags.length ? tags : ['Unconfirmed'];
}

function summarizeAlerts(alerts, label) {
  const wins = alerts.filter((alert) => alert.outcome === 'WIN');
  const avgConfidence = alerts.length ? alerts.reduce((sum, alert) => sum + alert.confidence, 0) / alerts.length : 0;
  const avgPredicted = alerts.length ? alerts.reduce((sum, alert) => sum + alert.predictedProbability, 0) / alerts.length : 0;
  const actualWinRate = alerts.length ? wins.length / alerts.length : 0;
  return {
    label,
    count: alerts.length,
    avgConfidence: round(avgConfidence),
    predictedWinRate: round(avgPredicted * 100),
    actualWinRate: round(actualWinRate * 100),
    calibrationError: round(Math.abs(actualWinRate - avgPredicted) * 100),
    avgR: alerts.length ? round(alerts.reduce((sum, alert) => sum + alert.rMultiple, 0) / alerts.length, 2) : 0,
  };
}

function calculateRsi(closes, period = 14) {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let index = closes.length - period; index < closes.length; index += 1) {
    const delta = closes[index] - closes[index - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  if (losses === 0) return 99;
  const rs = gains / losses;
  return round(100 - (100 / (1 + rs)));
}

function calculateMacd(closes) {
  const ema12 = calculateEma(closes, 12);
  const ema26 = calculateEma(closes, 26);
  const macdLine = closes.map((_, index) => (ema12[index] || closes[index]) - (ema26[index] || closes[index]));
  const signalLine = calculateEma(macdLine, 9);
  const line = macdLine.at(-1) || 0;
  const signal = signalLine.at(-1) || 0;
  return {
    line: round(line, 4),
    signal: round(signal, 4),
    histogram: round(line - signal, 4),
  };
}

function calculateEma(values, period) {
  const multiplier = 2 / (period + 1);
  return values.reduce((ema, value, index) => {
    if (index === 0) return [value];
    ema.push((value - ema[index - 1]) * multiplier + ema[index - 1]);
    return ema;
  }, []);
}

export function listMarketSegments() {
  return MARKET_SEGMENTS.map((segment) => ({
    id: segment.id,
    label: segment.label,
    venues: segment.venues,
    assets: segment.assets,
  }));
}
