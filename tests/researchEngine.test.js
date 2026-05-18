import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompanyAnalysis, buildOptionsAnalytics, buildPlatformFeatureMatrix, buildResearchDashboard, buildSectorRotation, runStockScreener } from '../src/researchEngine.js';

test('buildResearchDashboard returns market mood, screens, events, and stock lists', () => {
  const dashboard = buildResearchDashboard({ segmentId: 'india-equity', timeframe: '15m', seed: 245 });
  assert.match(dashboard.marketMood.label, /Greed|Fear|Neutral/);
  assert.ok(dashboard.curatedScreens.length >= 5);
  assert.ok(Array.isArray(dashboard.todaysStocks.gainers));
  assert.ok(dashboard.events.length > 0);
});

test('runStockScreener applies presets and custom filters', () => {
  const results = runStockScreener({ screenId: 'value-quality', seed: 245, filters: { maxPe: 30, minRoe: 10 } });
  assert.ok(Array.isArray(results));
  for (const stock of results) {
    assert.ok(stock.pe <= 30);
    assert.ok(stock.roe >= 10);
  }
});

test('buildCompanyAnalysis returns fundamentals, peers, financials, and scores', () => {
  const analysis = buildCompanyAnalysis({ symbol: 'RELIANCE', seed: 245 });
  assert.ok(analysis.stock.symbol);
  assert.ok(analysis.financials.length === 5);
  assert.ok(analysis.peers.length > 0);
  assert.ok(analysis.scores.quality >= 0);
});

test('buildOptionsAnalytics returns option chain, PCR, max pain, and straddle metrics', () => {
  const options = buildOptionsAnalytics({ symbol: 'NIFTY 50', seed: 245, spot: 23600 });
  assert.equal(options.chain.length, 11);
  assert.ok(options.pcr > 0);
  assert.ok(options.maxPain > 0);
  assert.ok(options.atmStraddle > 0);
});

test('sector rotation and feature matrix expose platform-inspired modules', () => {
  const sectors = buildSectorRotation({ seed: 245 });
  const matrix = buildPlatformFeatureMatrix();
  assert.ok(sectors.some((sector) => sector.quadrant === 'Leading' || sector.quadrant === 'Lagging' || sector.quadrant === 'Improving' || sector.quadrant === 'Weakening'));
  assert.ok(matrix.some((feature) => feature.source.includes('StockMojo')));
});
