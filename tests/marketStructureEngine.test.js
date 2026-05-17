import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeMarketStructure,
  detectBreakOfStructure,
  detectBreakout,
  detectFairValueGaps,
  detectLiquiditySweep,
  generateSyntheticCandles,
} from '../src/marketStructureEngine.js';

const basePrior = Array.from({ length: 18 }, (_, index) => ({
  index,
  open: 100,
  high: 105,
  low: 95,
  close: 100,
  volume: 100000,
}));

test('detectLiquiditySweep identifies a real sell-side sweep with close rejection', () => {
  const candles = [
    ...basePrior,
    { index: 18, open: 99, high: 101, low: 92, close: 98, volume: 180000 },
  ];
  const sweep = detectLiquiditySweep(candles);

  assert.equal(sweep.detected, true);
  assert.equal(sweep.direction, 'bullish');
  assert.equal(sweep.level, 95);
});

test('detectBreakOfStructure requires a close beyond swing structure', () => {
  const candles = [
    ...basePrior,
    { index: 18, open: 104, high: 111, low: 103, close: 110, volume: 160000 },
  ];
  const bos = detectBreakOfStructure(candles);

  assert.equal(bos.detected, true);
  assert.equal(bos.direction, 'bullish');
  assert.equal(bos.level, 105);
});

test('detectBreakout separates real expansion from fake rejection', () => {
  const realCandles = [
    ...basePrior,
    { index: 18, open: 104, high: 113, low: 103, close: 112, volume: 210000 },
  ];
  const fakeCandles = [
    ...basePrior,
    { index: 18, open: 103, high: 111, low: 99, close: 104, volume: 90000 },
  ];

  assert.equal(detectBreakout(realCandles).type, 'real');
  assert.equal(detectBreakout(fakeCandles).type, 'fake');
});

test('detectFairValueGaps identifies real unmitigated imbalance zones', () => {
  const candles = [
    { index: 0, open: 100, high: 101, low: 99, close: 100, volume: 100000 },
    { index: 1, open: 100, high: 110, low: 99, close: 109, volume: 220000 },
    { index: 2, open: 112, high: 115, low: 111, close: 114, volume: 210000 },
    { index: 3, open: 114, high: 116, low: 112, close: 115, volume: 120000 },
  ];
  const gaps = detectFairValueGaps(candles);

  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].direction, 'bullish');
  assert.equal(gaps[0].status, 'active');
});

test('analyzeMarketStructure returns deterministic scanner summary', () => {
  const candles = generateSyntheticCandles({ seed: 245, bars: 40, basePrice: 1000, volatility: 1.1 });
  const first = analyzeMarketStructure({ seed: 245, bars: 40, basePrice: 1000, volatility: 1.1 });
  const second = analyzeMarketStructure({ seed: 245, bars: 40, basePrice: 1000, volatility: 1.1 });

  assert.equal(candles.length, 40);
  assert.equal(first.summary, second.summary);
  assert.match(first.summary, /breakout/);
});
