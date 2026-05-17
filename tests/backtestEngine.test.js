import test from 'node:test';
import assert from 'node:assert/strict';
import { runBacktest, runMonteCarloSimulation } from '../src/backtestEngine.js';
import { buildStrategy } from '../src/strategyEngine.js';

test('runBacktest returns metrics and respects strategy max trades', () => {
  const strategy = buildStrategy({ preset: 'aggressive', maxTrades: 6, minConfidence: 40 });
  const result = runBacktest({ segmentId: 'india-equity', timeframe: '15m', seed: 245, bars: 120, strategy });

  assert.equal(result.symbol, 'NIFTY 50');
  assert.ok(result.tradeCount <= 6);
  assert.equal(result.tradeCount, result.trades.length);
  assert.ok(Number.isFinite(result.totalReturn));
  assert.ok(result.winRate >= 0 && result.winRate <= 100);
  assert.ok(result.equityCurve.length >= 1);
});

test('conservative strategy filters more trades than aggressive strategy', () => {
  const conservative = runBacktest({
    segmentId: 'crypto',
    timeframe: '1h',
    seed: 900,
    bars: 180,
    strategy: buildStrategy({ preset: 'conservative' }),
  });
  const aggressive = runBacktest({
    segmentId: 'crypto',
    timeframe: '1h',
    seed: 900,
    bars: 180,
    strategy: buildStrategy({ preset: 'aggressive' }),
  });

  assert.ok(aggressive.tradeCount >= conservative.tradeCount);
});

test('runMonteCarloSimulation projects bounded scenario statistics', () => {
  const backtest = runBacktest({
    segmentId: 'forex',
    timeframe: '4h',
    seed: 700,
    bars: 150,
    strategy: buildStrategy({ preset: 'aggressive', maxTrades: 10 }),
  });
  const simulation = runMonteCarloSimulation(backtest, { paths: 50, seed: 123 });

  assert.equal(simulation.paths, 50);
  assert.ok(simulation.probabilityPositive >= 0 && simulation.probabilityPositive <= 100);
  assert.ok(simulation.bestReturn >= simulation.worstReturn);
});
