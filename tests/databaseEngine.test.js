import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createCustomAlertRule,
  createPortfolioTrade,
  deleteCustomAlertRule,
  evaluateCustomAlertRules,
  listCustomAlertRules,
  listPortfolioTrades,
  summarizePortfolio,
} from '../src/databaseEngine.js';

test('custom alert rules are persisted and evaluated against market prices', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'signal-db-'));
  const dbPath = join(dir, 'db.json');
  try {
    const rule = await createCustomAlertRule({ symbol: 'RELIANCE', condition: 'below', threshold: 950, note: 'support break' }, dbPath);
    const rules = await listCustomAlertRules(dbPath);
    const evaluated = evaluateCustomAlertRules(rules, { RELIANCE: 940 });

    assert.equal(rules.length, 1);
    assert.equal(rule.symbol, 'RELIANCE');
    assert.equal(evaluated[0].triggered, true);
    assert.equal(evaluated[0].status, 'TRIGGERED');

    const result = await deleteCustomAlertRule(rule.id, dbPath);
    assert.equal(result.deleted, true);
    assert.equal((await listCustomAlertRules(dbPath)).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('portfolio trades calculate realized P&L and open position capital', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'portfolio-db-'));
  const dbPath = join(dir, 'db.json');
  try {
    await createPortfolioTrade({ symbol: 'NIFTY 50', side: 'LONG', quantity: 2, entryPrice: 100, exitPrice: 112 }, dbPath);
    await createPortfolioTrade({ symbol: 'BTC/USDT', side: 'SHORT', quantity: 1.5, entryPrice: 50000 }, dbPath);
    const trades = await listPortfolioTrades(dbPath);
    const portfolio = summarizePortfolio(trades);

    assert.equal(portfolio.summary.totalTrades, 2);
    assert.equal(portfolio.summary.openTrades, 1);
    assert.equal(portfolio.summary.realizedPnl, 24);
    assert.equal(portfolio.summary.investedCapital, 75000);
    assert.equal(portfolio.trades.find((trade) => trade.symbol === 'NIFTY 50').pnl, 24);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
