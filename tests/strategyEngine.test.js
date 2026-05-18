import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStrategy, describeStrategy, normalizeWeights } from '../src/strategyEngine.js';

test('buildStrategy clamps invalid builder inputs into safe ranges', () => {
  const strategy = buildStrategy({
    minConfidence: 500,
    minLiquidity: -10,
    maxSpreadRisk: 999,
    riskReward: 0,
    riskPerTrade: 99,
    maxTrades: 0,
  });

  assert.equal(strategy.minConfidence, 99);
  assert.equal(strategy.minLiquidity, 1);
  assert.equal(strategy.maxSpreadRisk, 100);
  assert.equal(strategy.riskReward, 0.25);
  assert.equal(strategy.riskPerTrade, 5);
  assert.equal(strategy.maxTrades, 1);
});

test('normalizeWeights converts custom weights into a sum of one', () => {
  const weights = normalizeWeights({ flow: 2, trend: 1, sentiment: 1, skew: 0 });
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  assert.equal(Math.round(total * 1000), 1000);
  assert.equal(weights.flow, 0.5);
});

test('describeStrategy explains active builder rules', () => {
  const strategy = buildStrategy({ preset: 'balanced' });
  assert.match(describeStrategy(strategy), /confidence/);
  assert.match(describeStrategy(strategy), /RR/);
});
