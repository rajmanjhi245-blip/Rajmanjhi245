import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { buildAccuracyBacktest, buildAlertHistory, buildTradingSignals, listMarketSegments } from './src/alertEngine.js';
import { createCustomAlertRule, createPortfolioTrade, deleteCustomAlertRule, deletePortfolioTrade, evaluateCustomAlertRules, listCustomAlertRules, listPortfolioTrades, summarizePortfolio } from './src/databaseEngine.js';
import { buildStrategy } from './src/strategyEngine.js';

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, url, res);
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = join(root, safePath);

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

async function handleApi(req, url, res) {
  try {
    const request = parseSignalRequest(url);
    if (url.pathname === '/api/market-data') {
      writeJson(res, { segments: listMarketSegments(), request });
      return;
    }
    if (url.pathname === '/api/signals') {
      writeJson(res, { signals: buildTradingSignals(request), request });
      return;
    }
    if (url.pathname === '/api/alerts/history') {
      const alerts = buildAlertHistory(request);
      writeJson(res, { alerts, request });
      return;
    }
    if (url.pathname === '/api/accuracy-backtest') {
      const alerts = buildAlertHistory(request);
      writeJson(res, { alerts, accuracy: buildAccuracyBacktest(alerts), request });
      return;
    }
    if (url.pathname === '/api/custom-alert-rules') {
      if (req.method === 'GET') {
        const rules = await listCustomAlertRules();
        const prices = currentMarketPrices(request);
        writeJson(res, { rules: evaluateCustomAlertRules(rules, prices), prices, request });
        return;
      }
      if (req.method === 'POST') {
        writeJson(res, { rule: await createCustomAlertRule(await readJsonBody(req)) }, 201);
        return;
      }
      if (req.method === 'DELETE') {
        writeJson(res, await deleteCustomAlertRule(url.searchParams.get('id')));
        return;
      }
    }
    if (url.pathname === '/api/portfolio/trades') {
      if (req.method === 'GET') {
        writeJson(res, summarizePortfolio(await listPortfolioTrades()));
        return;
      }
      if (req.method === 'POST') {
        writeJson(res, { trade: await createPortfolioTrade(await readJsonBody(req)) }, 201);
        return;
      }
      if (req.method === 'DELETE') {
        writeJson(res, await deletePortfolioTrade(url.searchParams.get('id')));
        return;
      }
    }
    if (url.pathname === '/api/portfolio/pnl') {
      writeJson(res, summarizePortfolio(await listPortfolioTrades()));
      return;
    }
    writeJson(res, { error: 'Unknown API endpoint' }, 404);
  } catch (error) {
    writeJson(res, { error: error.message }, 500);
  }
}

function parseSignalRequest(url) {
  const strategyOverrides = { preset: url.searchParams.get('preset') || 'balanced' };
  ['minConfidence', 'minLiquidity', 'maxSpreadRisk', 'riskReward', 'riskPerTrade', 'maxTrades'].forEach((key) => {
    if (url.searchParams.has(key)) strategyOverrides[key] = numberParam(url, key, undefined);
  });
  const strategy = buildStrategy(strategyOverrides);
  return {
    segmentId: url.searchParams.get('segmentId') || 'india-equity',
    timeframe: url.searchParams.get('timeframe') || '15m',
    seed: numberParam(url, 'seed', 245),
    periods: numberParam(url, 'periods', 36),
    strategy,
  };
}

function currentMarketPrices(request) {
  return Object.fromEntries(
    buildTradingSignals(request).map((signal) => [signal.symbol, signal.entry]),
  );
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function numberParam(url, key, fallback) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function writeJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

server.listen(port, () => {
  console.log(`Institutional Signal Lab running at http://localhost:${port}`);
});
