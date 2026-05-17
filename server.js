import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { buildAccuracyBacktest, buildAlertHistory, buildTradingSignals, listMarketSegments } from './src/alertEngine.js';
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
    handleApi(url, res);
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

function handleApi(url, res) {
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
