import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { round } from './signalEngine.js';

const DEFAULT_DB = {
  customAlertRules: [],
  portfolioTrades: [],
};

export const defaultDbPath = () => process.env.TRADING_DB_PATH || join(process.cwd(), 'data', 'trading-db.json');

export async function readDatabase(dbPath = defaultDbPath()) {
  try {
    const data = JSON.parse(await readFile(dbPath, 'utf8'));
    return {
      customAlertRules: Array.isArray(data.customAlertRules) ? data.customAlertRules : [],
      portfolioTrades: Array.isArray(data.portfolioTrades) ? data.portfolioTrades : [],
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeDatabase(DEFAULT_DB, dbPath);
    return { ...DEFAULT_DB };
  }
}

export async function writeDatabase(data, dbPath = defaultDbPath()) {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

export async function listCustomAlertRules(dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  return db.customAlertRules;
}

export async function createCustomAlertRule(input, dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  const rule = normalizeAlertRule(input);
  db.customAlertRules.unshift(rule);
  await writeDatabase(db, dbPath);
  return rule;
}

export async function deleteCustomAlertRule(id, dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  const before = db.customAlertRules.length;
  db.customAlertRules = db.customAlertRules.filter((rule) => rule.id !== id);
  await writeDatabase(db, dbPath);
  return { deleted: before !== db.customAlertRules.length, id };
}

export function evaluateCustomAlertRules(rules, marketPrices) {
  return rules.map((rule) => {
    const currentPrice = Number(marketPrices[rule.symbol]);
    const triggered = Number.isFinite(currentPrice)
      ? rule.condition === 'below'
        ? currentPrice <= rule.threshold
        : currentPrice >= rule.threshold
      : false;
    return {
      ...rule,
      currentPrice: Number.isFinite(currentPrice) ? round(currentPrice) : null,
      triggered,
      status: triggered ? 'TRIGGERED' : 'ARMED',
    };
  });
}

export async function listPortfolioTrades(dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  return db.portfolioTrades;
}

export async function createPortfolioTrade(input, dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  const trade = normalizePortfolioTrade(input);
  db.portfolioTrades.unshift(trade);
  await writeDatabase(db, dbPath);
  return trade;
}

export async function deletePortfolioTrade(id, dbPath = defaultDbPath()) {
  const db = await readDatabase(dbPath);
  const before = db.portfolioTrades.length;
  db.portfolioTrades = db.portfolioTrades.filter((trade) => trade.id !== id);
  await writeDatabase(db, dbPath);
  return { deleted: before !== db.portfolioTrades.length, id };
}

export function summarizePortfolio(trades) {
  const realizedTrades = trades.map((trade) => ({ ...trade, pnl: calculateTradePnl(trade) }));
  const closed = realizedTrades.filter((trade) => Number.isFinite(trade.exitPrice));
  const open = realizedTrades.filter((trade) => !Number.isFinite(trade.exitPrice));
  const realizedPnl = closed.reduce((sum, trade) => sum + trade.pnl, 0);
  const investedCapital = open.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0);
  const winners = closed.filter((trade) => trade.pnl > 0);

  return {
    trades: realizedTrades,
    summary: {
      totalTrades: trades.length,
      openTrades: open.length,
      closedTrades: closed.length,
      realizedPnl: round(realizedPnl),
      investedCapital: round(investedCapital),
      winRate: closed.length ? round((winners.length / closed.length) * 100) : 0,
      avgPnl: closed.length ? round(realizedPnl / closed.length) : 0,
    },
  };
}

export function calculateTradePnl(trade) {
  if (!Number.isFinite(trade.exitPrice)) return 0;
  const direction = trade.side === 'SHORT' ? -1 : 1;
  return round((trade.exitPrice - trade.entryPrice) * trade.quantity * direction);
}

function normalizeAlertRule(input) {
  const symbol = String(input.symbol || '').trim().toUpperCase();
  const threshold = Number(input.threshold);
  if (!symbol) throw new Error('Alert rule symbol is required');
  if (!Number.isFinite(threshold) || threshold <= 0) throw new Error('Alert rule threshold must be a positive number');
  const condition = input.condition === 'above' ? 'above' : 'below';
  return {
    id: input.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    condition,
    threshold: round(threshold),
    note: String(input.note || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizePortfolioTrade(input) {
  const symbol = String(input.symbol || '').trim().toUpperCase();
  const side = input.side === 'SHORT' ? 'SHORT' : 'LONG';
  const quantity = Number(input.quantity);
  const entryPrice = Number(input.entryPrice);
  const exitPrice = input.exitPrice === '' || input.exitPrice === null || input.exitPrice === undefined ? null : Number(input.exitPrice);
  if (!symbol) throw new Error('Trade symbol is required');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Trade quantity must be a positive number');
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) throw new Error('Trade entry price must be a positive number');
  if (exitPrice !== null && (!Number.isFinite(exitPrice) || exitPrice <= 0)) throw new Error('Trade exit price must be blank or a positive number');

  return {
    id: input.id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    side,
    quantity: round(quantity, 4),
    entryPrice: round(entryPrice),
    exitPrice: exitPrice === null ? null : round(exitPrice),
    signalId: String(input.signalId || '').trim(),
    note: String(input.note || '').trim(),
    openedAt: input.openedAt || new Date().toISOString(),
  };
}
