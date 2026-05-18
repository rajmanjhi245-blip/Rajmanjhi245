import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAccuracyBacktest, buildAlertHistory, buildTradingSignals, calculateIndicators, listMarketSegments } from '../src/alertEngine.js';
import { generateSyntheticCandles } from '../src/marketStructureEngine.js';

test('buildTradingSignals adds indicator setups and structure metadata', () => {
  const signals = buildTradingSignals({ segmentId: 'india-equity', timeframe: '15m', seed: 245 });
  assert.ok(signals.length > 0);
  assert.ok(signals[0].id.includes('india-equity'));
  assert.ok(signals[0].indicators.rsi >= 0 && signals[0].indicators.rsi <= 99);
  assert.ok(Array.isArray(signals[0].setupTags));
  assert.ok(signals[0].structure.summary.includes('breakout'));
});

test('buildAlertHistory tracks completed historical alert outcomes', () => {
  const alerts = buildAlertHistory({ segmentId: 'crypto', timeframe: '1h', seed: 500, periods: 12 });
  assert.ok(alerts.length > 0);
  assert.match(alerts[0].outcome, /WIN|LOSS/);
  assert.ok(alerts[0].predictedProbability >= 0.05 && alerts[0].predictedProbability <= 0.95);
});

test('buildAccuracyBacktest compares predicted and actual setup performance', () => {
  const alerts = buildAlertHistory({ segmentId: 'forex', timeframe: '4h', seed: 700, periods: 18 });
  const accuracy = buildAccuracyBacktest(alerts);
  assert.equal(accuracy.totalAlerts, alerts.length);
  assert.ok(accuracy.overall.actualWinRate >= 0 && accuracy.overall.actualWinRate <= 100);
  assert.ok(accuracy.bySetup.some((setup) => setup.label === 'RSI'));
  assert.ok(accuracy.byConfidenceBucket.length > 0);
});

test('calculateIndicators returns RSI, MACD, and trend confluence', () => {
  const candles = generateSyntheticCandles({ seed: 123, bars: 80, basePrice: 1000, volatility: 1.4 });
  const indicators = calculateIndicators(candles);
  assert.match(indicators.rsiBias, /bullish|bearish|neutral/);
  assert.match(indicators.macdBias, /bullish|bearish|neutral/);
  assert.match(indicators.trendConfluence, /bullish|bearish|neutral/);
});

test('listMarketSegments exposes endpoint market metadata', () => {
  const segments = listMarketSegments();
  assert.ok(segments.some((segment) => segment.id === 'india-equity'));
  assert.ok(segments.every((segment) => Array.isArray(segment.assets)));
});
