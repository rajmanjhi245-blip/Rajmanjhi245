import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKET_SEGMENTS, TIMEFRAMES, analyzeSignal, buildSignals, createMarketSnapshot, summarizeSignals } from '../src/signalEngine.js';

test('buildSignals creates executable signals for every supported segment and timeframe', () => {
  for (const segment of MARKET_SEGMENTS) {
    for (const timeframe of TIMEFRAMES) {
      const signals = buildSignals({ segmentId: segment.id, timeframe, seed: 245 });
      assert.equal(signals.length, segment.assets.length);
      for (const signal of signals) {
        assert.match(signal.action, /BUY|SELL|WAIT/);
        assert.ok(signal.confidence >= 0 && signal.confidence <= 99);
        assert.equal(signal.timeframe, timeframe);
      }
    }
  }
});

test('risk engine blocks low-liquidity setups instead of forcing fake precision', () => {
  const snapshot = createMarketSnapshot({ symbol: 'TEST', segment: 'Synthetic', timeframe: '5m', seed: 12 });
  snapshot.liquidityScore = 10;
  snapshot.spreadRisk = 90;
  const signal = analyzeSignal(snapshot);
  assert.equal(signal.action, 'WAIT');
  assert.equal(signal.stopLoss, null);
  assert.deepEqual(signal.targets, []);
});

test('summary counts all signal actions and average confidence', () => {
  const signals = buildSignals({ segmentId: 'crypto', timeframe: '1h', seed: 500 });
  const summary = summarizeSignals(signals);
  assert.equal(summary.BUY + summary.SELL + summary.WAIT, signals.length);
  assert.ok(summary.avgConfidence >= 0);
});
