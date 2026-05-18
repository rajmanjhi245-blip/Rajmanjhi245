import { buildAccuracyBacktest, buildAlertHistory, buildTradingSignals } from './alertEngine.js';
import { runBacktest, runMonteCarloSimulation } from './backtestEngine.js';
import { MARKET_SEGMENTS, TIMEFRAMES, summarizeSignals } from './signalEngine.js';
import { STRATEGY_PRESETS, buildStrategy, describeStrategy } from './strategyEngine.js';

const segmentSelect = document.querySelector('#segment');
const timeframeSelect = document.querySelector('#timeframe');
const seedInput = document.querySelector('#seed');
const refreshButton = document.querySelector('#refresh');
const liveMode = document.querySelector('#liveMode');
const feedStatus = document.querySelector('#feedStatus');
const signalsEl = document.querySelector('#signals');
const buyCount = document.querySelector('#buyCount');
const sellCount = document.querySelector('#sellCount');
const waitCount = document.querySelector('#waitCount');
const avgConfidence = document.querySelector('#avgConfidence');
const presetSelect = document.querySelector('#strategyPreset');
const minConfidenceInput = document.querySelector('#minConfidence');
const minLiquidityInput = document.querySelector('#minLiquidity');
const maxSpreadInput = document.querySelector('#maxSpreadRisk');
const riskRewardInput = document.querySelector('#riskReward');
const riskPerTradeInput = document.querySelector('#riskPerTrade');
const maxTradesInput = document.querySelector('#maxTrades');
const strategyDescription = document.querySelector('#strategyDescription');
const backtestButton = document.querySelector('#runBacktest');
const simulationButton = document.querySelector('#runSimulation');
const backtestMetrics = document.querySelector('#backtestMetrics');
const tradeTable = document.querySelector('#tradeTable');
const simulationOutput = document.querySelector('#simulationOutput');
const structureDashboard = document.querySelector('#structureDashboard');
const researchTerminal = document.querySelector('#researchTerminal');
const alertHistoryEl = document.querySelector('#alertHistory');
const accuracyBacktestEl = document.querySelector('#accuracyBacktest');
const customAlertForm = document.querySelector('#customAlertForm');
const customAlertRulesEl = document.querySelector('#customAlertRules');
const portfolioTradeForm = document.querySelector('#portfolioTradeForm');
const portfolioMetrics = document.querySelector('#portfolioMetrics');
const portfolioTradesEl = document.querySelector('#portfolioTrades');

let latestBacktest = null;

function populateControls() {
  segmentSelect.innerHTML = MARKET_SEGMENTS
    .map((segment) => `<option value="${segment.id}">${segment.label}</option>`)
    .join('');
  timeframeSelect.innerHTML = TIMEFRAMES
    .map((timeframe) => `<option value="${timeframe}" ${timeframe === '15m' ? 'selected' : ''}>${timeframe}</option>`)
    .join('');
  presetSelect.innerHTML = Object.values(STRATEGY_PRESETS)
    .map((preset) => `<option value="${preset.id}">${preset.name}</option>`)
    .join('');
  applyPreset('balanced');
}

function applyPreset(presetId) {
  const preset = STRATEGY_PRESETS[presetId] || STRATEGY_PRESETS.balanced;
  minConfidenceInput.value = preset.minConfidence;
  minLiquidityInput.value = preset.minLiquidity;
  maxSpreadInput.value = preset.maxSpreadRisk;
  riskRewardInput.value = preset.riskReward;
  riskPerTradeInput.value = preset.riskPerTrade;
  maxTradesInput.value = preset.maxTrades;
  updateStrategyDescription();
}

function currentStrategy() {
  return buildStrategy({
    preset: presetSelect.value,
    minConfidence: minConfidenceInput.value,
    minLiquidity: minLiquidityInput.value,
    maxSpreadRisk: maxSpreadInput.value,
    riskReward: riskRewardInput.value,
    riskPerTrade: riskPerTradeInput.value,
    maxTrades: maxTradesInput.value,
  });
}

function updateStrategyDescription() {
  strategyDescription.textContent = describeStrategy(currentStrategy());
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (value === Infinity) return '∞';
  return Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value) {
  return Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }).format(value);
}

function currentSeed() {
  if (!liveMode.checked) return Number(seedInput.value || 1);
  return Math.floor(Date.now() / 30_000);
}

function renderSignals() {
  const seed = currentSeed();
  const strategy = currentStrategy();
  const signals = buildTradingSignals({
    segmentId: segmentSelect.value,
    timeframe: timeframeSelect.value,
    seed,
    strategy,
  });
  const summary = summarizeSignals(signals);

  buyCount.textContent = summary.BUY;
  sellCount.textContent = summary.SELL;
  waitCount.textContent = summary.WAIT;
  avgConfidence.textContent = `${summary.avgConfidence}%`;
  feedStatus.textContent = liveMode.checked
    ? `Live sentiment simulator refreshed at ${new Date().toLocaleTimeString('en-IN')}. Connect licensed market feeds for production execution.`
    : `Scenario seed ${seed} loaded for deterministic replay and testing.`;

  const structures = signals.map((signal) => ({ signal, structure: signal.structure }));
  trackOpenAlerts(signals);

  renderStructureDashboard(structures);

  signalsEl.innerHTML = structures.map(({ signal, structure }) => `
    <article class="card ${signal.action.toLowerCase()}">
      <div class="card-top">
        <div>
          <h2>${signal.symbol}</h2>
          <p>${signal.segment} · ${signal.timeframe}</p>
        </div>
        <span class="badge">${signal.action}</span>
      </div>
      <dl class="levels">
        <div><dt>Entry</dt><dd>${formatValue(signal.entry)}</dd></div>
        <div><dt>Stop loss</dt><dd>${formatValue(signal.stopLoss)}</dd></div>
        <div><dt>Target 1</dt><dd>${formatValue(signal.targets[0])}</dd></div>
        <div><dt>Target 2</dt><dd>${formatValue(signal.targets[1])}</dd></div>
        <div><dt>Target 3</dt><dd>${formatValue(signal.targets[2])}</dd></div>
        <div><dt>Options</dt><dd>${signal.derivativeBias}</dd></div>
      </dl>
      <div class="confidence" aria-label="Confidence ${signal.confidence}%">
        <span style="width: ${signal.confidence}%"></span>
      </div>
      <div class="structure-tags">
        <span>${structure.liquiditySweep.detected ? 'Sweep' : 'No sweep'}: ${structure.liquiditySweep.direction}</span>
        <span>BOS: ${structure.breakOfStructure.direction}</span>
        <span>${structure.breakout.type} breakout</span>
        <span>FVG: ${structure.latestFvg ? `${structure.latestFvg.direction} ${structure.latestFvg.status}` : 'none'}</span>
        <span>RSI ${signal.indicators.rsi}</span>
        <span>MACD ${signal.indicators.macdBias}</span>
        <span>${signal.setupTags.join(' + ')}</span>
      </div>
      <p class="rationale"><strong>Risk ${signal.riskGrade}</strong> · ${signal.confidence}% · ${signal.rationale}</p>
      <p class="rationale"><strong>Structure:</strong> ${structure.summary}</p>
    </article>
  `).join('');
}

function renderStructureDashboard(structures) {
  const primary = structures[0]?.structure;
  if (!primary) {
    structureDashboard.innerHTML = '';
    return;
  }

  const activeFvgs = structures.flatMap(({ signal, structure }) =>
    structure.fairValueGaps
      .filter((gap) => gap.status === 'active')
      .map((gap) => ({ ...gap, symbol: signal.symbol })),
  );

  structureDashboard.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Smart money structure</p>
        <h2>Liquidity sweep, BOS, breakout, and FVG scanner</h2>
        <p>Heuristic pattern confirmation uses wick rejection, swing closes, volume expansion, body expansion, and imbalance mitigation rules.</p>
      </div>
    </div>
    <div class="structure-grid">
      ${renderPatternCard(primary.liquiditySweep)}
      ${renderPatternCard(primary.breakOfStructure)}
      ${renderPatternCard(primary.breakout, primary.breakout.type === 'real' ? 'Real Breakout' : primary.breakout.type === 'fake' ? 'Fake Breakout' : 'Breakout')}
      ${renderFvgCard(primary.latestFvg)}
    </div>
    <div class="fvg-list">
      <h3>Active real FVG zones across watchlist</h3>
      ${activeFvgs.length ? activeFvgs.slice(0, 8).map((gap) => `
        <article>
          <strong>${gap.symbol}</strong> ${gap.direction} · ${formatValue(gap.from)} → ${formatValue(gap.to)}
          <span>${gap.confidence}% · ${gap.verdict}</span>
        </article>
      `).join('') : '<p class="empty-state">No active real FVG zone passed the current imbalance filters.</p>'}
    </div>
  `;
}

function renderPatternCard(pattern, title = pattern.name) {
  return `
    <article class="structure-card ${pattern.direction}">
      <small>${title}</small>
      <strong>${pattern.detected ? pattern.direction : 'not confirmed'}</strong>
      <span>Level ${formatValue(pattern.level)} · ${pattern.confidence}%</span>
      <p>${pattern.verdict}</p>
    </article>
  `;
}

function renderFvgCard(gap) {
  if (!gap) {
    return `
      <article class="structure-card none">
        <small>Real FVG</small>
        <strong>not confirmed</strong>
        <span>No active imbalance</span>
        <p>No fair value gap passed size, impulse, and mitigation filters.</p>
      </article>
    `;
  }
  return `
    <article class="structure-card ${gap.direction}">
      <small>Real FVG</small>
      <strong>${gap.direction} ${gap.status}</strong>
      <span>${formatValue(gap.from)} → ${formatValue(gap.to)} · ${gap.confidence}%</span>
      <p>${gap.verdict}</p>
    </article>
  `;
}

async function renderResearchTerminal() {
  try {
    const seed = Number(seedInput.value || 1);
    const [dashboardRes, companyRes, optionsRes, sectorsRes] = await Promise.all([
      fetch(`/api/research-dashboard?segmentId=${segmentSelect.value}&timeframe=${timeframeSelect.value}&seed=${seed}`),
      fetch(`/api/company-analysis?symbol=RELIANCE&segmentId=${segmentSelect.value}&timeframe=1D&seed=${seed}`),
      fetch(`/api/options-chain?symbol=NIFTY%2050&seed=${seed}&spot=23600`),
      fetch(`/api/sector-rotation?seed=${seed}`),
    ]);
    const { dashboard, featureMatrix } = await dashboardRes.json();
    const { analysis } = await companyRes.json();
    const { options } = await optionsRes.json();
    const { sectors } = await sectorsRes.json();
    researchTerminal.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Research terminal</p>
          <h2>Screener, fundamentals, sectors, events, and options lab</h2>
          <p>Feature-inspired research suite; not a copy of any third-party platform. Data is deterministic until licensed feeds are connected.</p>
        </div>
      </div>
      <div class="metrics compact">
        <article><span>${dashboard.marketMood.label}</span><small>Market mood ${dashboard.marketMood.score}</small></article>
        <article><span>${dashboard.marketMood.breadth}%</span><small>Positive breadth</small></article>
        <article><span>${options.pcr}</span><small>Options PCR</small></article>
        <article><span>${options.maxPain}</span><small>Max pain</small></article>
        <article><span>${formatValue(options.atmStraddle)}</span><small>ATM straddle</small></article>
        <article><span>${options.ivSkew}%</span><small>IV skew</small></article>
      </div>
      <div class="research-grid">
        <article class="research-card"><h3>Today's stocks</h3>${renderMiniList('Gainers', dashboard.todaysStocks.gainers)}${renderMiniList('Losers', dashboard.todaysStocks.losers)}</article>
        <article class="research-card"><h3>Curated screens</h3>${dashboard.curatedScreens.map((screen) => `<p><strong>${screen.name}</strong><span>${screen.description}</span><small>${screen.matches.length} matches</small></p>`).join('')}</article>
        <article class="research-card"><h3>Company analysis: ${analysis.stock.symbol}</h3><p>P/E ${analysis.stock.pe} · ROE ${analysis.stock.roe}% · D/E ${analysis.stock.debtToEquity}</p><p>Valuation ${analysis.scores.valuation} · Quality ${analysis.scores.quality} · Momentum ${analysis.scores.momentum}</p><p>${analysis.notes.join(' ')}</p></article>
        <article class="research-card"><h3>Sector rotation</h3>${sectors.map((sector) => `<p><strong>${sector.sector}</strong><span>${sector.quadrant} · RS ${sector.relativeStrength} · Mom ${sector.momentum}</span></p>`).join('')}</article>
        <article class="research-card"><h3>Options chain sample</h3><div class="trade-table"><table><thead><tr><th>Strike</th><th>Call OI</th><th>Call IV</th><th>Put OI</th><th>Put IV</th></tr></thead><tbody>${options.chain.slice(3, 8).map((row) => `<tr><td>${row.strike}</td><td>${formatValue(row.call.oi)}</td><td>${row.call.iv}%</td><td>${formatValue(row.put.oi)}</td><td>${row.put.iv}%</td></tr>`).join('')}</tbody></table></div></article>
        <article class="research-card"><h3>Events & feature map</h3>${dashboard.events.map((event) => `<p><strong>${event.symbol}</strong><span>${event.type} · ${event.impact} impact · T+${event.dueInDays}</span></p>`).join('')}<hr />${featureMatrix.map((feature) => `<p><strong>${feature.source}</strong><span>${feature.implemented.join(', ')}</span></p>`).join('')}</article>
      </div>
    `;
  } catch (error) {
    researchTerminal.innerHTML = `<p class="empty-state">Unable to load research terminal: ${error.message}</p>`;
  }
}

function renderMiniList(title, stocks) {
  return `<h4>${title}</h4>${stocks.map((stock) => `<p><strong>${stock.symbol}</strong><span>${stock.changePct}% · ₹${formatValue(stock.entry)} · score ${stock.score}</span></p>`).join('')}`;
}

function currentRequest() {
  return {
    segmentId: segmentSelect.value,
    timeframe: timeframeSelect.value,
    seed: Number(seedInput.value || 1),
    strategy: currentStrategy(),
    periods: 36,
  };
}

function trackOpenAlerts(signals) {
  const tracked = readTrackedAlerts();
  const nextAlerts = signals
    .filter((signal) => signal.action !== 'WAIT')
    .map((signal) => ({
      id: signal.id,
      symbol: signal.symbol,
      segment: signal.segment,
      timeframe: signal.timeframe,
      action: signal.action,
      entry: signal.entry,
      confidence: signal.confidence,
      outcome: 'OPEN',
      setupTags: signal.setupTags,
      openedAt: new Date().toISOString(),
    }));
  const merged = [...nextAlerts, ...tracked]
    .filter((alert, index, alerts) => alerts.findIndex((item) => item.id === alert.id) === index)
    .slice(0, 40);
  localStorage.setItem('institutionalSignalAlerts', JSON.stringify(merged));
}

function readTrackedAlerts() {
  try {
    return JSON.parse(localStorage.getItem('institutionalSignalAlerts') || '[]');
  } catch {
    return [];
  }
}

function renderAlertAnalytics() {
  const completedHistory = buildAlertHistory(currentRequest());
  const tracked = readTrackedAlerts();
  const alerts = [...tracked, ...completedHistory].slice(0, 80);
  const accuracy = buildAccuracyBacktest(completedHistory);
  renderAlertHistory(alerts);
  renderAccuracyBacktest(accuracy);
}

function renderAlertHistory(alerts) {
  alertHistoryEl.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Alert history</p>
        <h2>Tracked trading signal alerts</h2>
        <p>Open alerts are tracked locally; completed historical alerts are replayed deterministically for review.</p>
      </div>
    </div>
    <div class="trade-table">
      <table>
        <thead><tr><th>Time</th><th>Symbol</th><th>Signal</th><th>Entry</th><th>Conf.</th><th>Outcome</th><th>R</th><th>Setups</th></tr></thead>
        <tbody>
          ${alerts.slice(0, 18).map((alert) => `
            <tr>
              <td>${new Date(alert.openedAt).toLocaleString('en-IN')}</td>
              <td>${alert.symbol}</td>
              <td>${alert.action}</td>
              <td>${formatValue(alert.entry)}</td>
              <td>${alert.confidence}%</td>
              <td>${alert.outcome}</td>
              <td>${formatValue(alert.rMultiple)}</td>
              <td>${(alert.setupTags || []).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAccuracyBacktest(accuracy) {
  const setupRows = accuracy.bySetup.filter((row) => row.count > 0);
  accuracyBacktestEl.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Signal accuracy backtest</p>
        <h2>Predicted confidence vs historical alert outcomes</h2>
        <p>Compare each setup's actual win rate against the confidence model that generated the original alert.</p>
      </div>
    </div>
    <div class="metrics compact">
      <article><span>${accuracy.totalAlerts}</span><small>Completed alerts</small></article>
      <article><span>${accuracy.overall.predictedWinRate}%</span><small>Predicted win rate</small></article>
      <article><span>${accuracy.overall.actualWinRate}%</span><small>Actual win rate</small></article>
      <article><span>${accuracy.overall.calibrationError}%</span><small>Calibration error</small></article>
      <article><span>${accuracy.overall.avgR}R</span><small>Average R</small></article>
      <article><span>${accuracy.overall.avgConfidence}%</span><small>Avg confidence</small></article>
    </div>
    <div class="accuracy-grid">
      ${setupRows.map((row) => renderAccuracyCard(row)).join('')}
    </div>
    <div class="accuracy-grid">
      ${accuracy.byConfidenceBucket.map((row) => renderAccuracyCard(row)).join('')}
    </div>
  `;
}

function renderAccuracyCard(row) {
  return `
    <article class="structure-card">
      <small>${row.label}</small>
      <strong>${row.actualWinRate}% actual</strong>
      <span>${row.predictedWinRate}% predicted · ${row.count} alerts</span>
      <p>${row.calibrationError}% calibration error · ${row.avgR}R average outcome.</p>
    </article>
  `;
}

async function renderPersistentTools() {
  await Promise.all([renderCustomAlertRules(), renderPortfolioTracker()]);
}

async function renderCustomAlertRules() {
  try {
    const response = await fetch(`/api/custom-alert-rules?segmentId=${segmentSelect.value}&timeframe=${timeframeSelect.value}&seed=${Number(seedInput.value || 1)}`);
    const { rules } = await response.json();
    customAlertRulesEl.innerHTML = rules.length ? `
      <table>
        <thead><tr><th>Status</th><th>Symbol</th><th>Rule</th><th>Current</th><th>Note</th><th>Created</th><th></th></tr></thead>
        <tbody>
          ${rules.map((rule) => `
            <tr>
              <td>${rule.status}</td>
              <td>${rule.symbol}</td>
              <td>${rule.condition} ${formatValue(rule.threshold)}</td>
              <td>${formatValue(rule.currentPrice)}</td>
              <td>${rule.note || '—'}</td>
              <td>${new Date(rule.createdAt).toLocaleString('en-IN')}</td>
              <td><button class="table-action" type="button" data-delete-rule="${rule.id}">Delete</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty-state">No custom alert rules saved yet.</p>';
  } catch (error) {
    customAlertRulesEl.innerHTML = `<p class="empty-state">Unable to load alert rules: ${error.message}</p>`;
  }
}

async function renderPortfolioTracker() {
  try {
    const response = await fetch('/api/portfolio/trades');
    const { trades, summary } = await response.json();
    portfolioMetrics.innerHTML = `
      <article><span>${formatMoney(summary.realizedPnl)}</span><small>Realized P&L</small></article>
      <article><span>${summary.totalTrades}</span><small>Total trades</small></article>
      <article><span>${summary.openTrades}</span><small>Open trades</small></article>
      <article><span>${summary.closedTrades}</span><small>Closed trades</small></article>
      <article><span>${summary.winRate}%</span><small>Win rate</small></article>
      <article><span>${formatMoney(summary.investedCapital)}</span><small>Open capital</small></article>
    `;
    portfolioTradesEl.innerHTML = trades.length ? `
      <table>
        <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Signal</th><th>Opened</th><th></th></tr></thead>
        <tbody>
          ${trades.map((trade) => `
            <tr>
              <td>${trade.symbol}</td>
              <td>${trade.side}</td>
              <td>${formatValue(trade.quantity)}</td>
              <td>${formatValue(trade.entryPrice)}</td>
              <td>${formatValue(trade.exitPrice)}</td>
              <td>${formatMoney(trade.pnl)}</td>
              <td>${trade.signalId || '—'}</td>
              <td>${new Date(trade.openedAt).toLocaleString('en-IN')}</td>
              <td><button class="table-action" type="button" data-delete-trade="${trade.id}">Delete</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty-state">No portfolio trades logged yet.</p>';
  } catch (error) {
    portfolioTradesEl.innerHTML = `<p class="empty-state">Unable to load portfolio trades: ${error.message}</p>`;
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
  return response.json();
}

async function deleteResource(url) {
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error((await response.json()).error || 'Delete failed');
}

function runStrategyBacktest() {
  latestBacktest = runBacktest({
    segmentId: segmentSelect.value,
    timeframe: timeframeSelect.value,
    seed: Number(seedInput.value || 1),
    strategy: currentStrategy(),
    bars: 180,
    startingCapital: 100000,
  });
  renderBacktest(latestBacktest);
  renderSimulation(runMonteCarloSimulation(latestBacktest, { paths: 250, seed: Number(seedInput.value || 1) + 500 }));
  renderAlertAnalytics();
}

function renderBacktest(result) {
  backtestMetrics.innerHTML = `
    <article><span>${formatMoney(result.endingCapital)}</span><small>Ending capital</small></article>
    <article><span>${formatValue(result.totalReturn)}%</span><small>Total return</small></article>
    <article><span>${formatValue(result.winRate)}%</span><small>Win rate</small></article>
    <article><span>${formatValue(result.maxDrawdown)}%</span><small>Max drawdown</small></article>
    <article><span>${formatValue(result.profitFactor)}</span><small>Profit factor</small></article>
    <article><span>${formatValue(result.expectancyR)}R</span><small>Expectancy</small></article>
  `;
  tradeTable.innerHTML = result.trades.length ? `
    <table>
      <thead><tr><th>#</th><th>Action</th><th>Entry</th><th>Exit</th><th>Conf.</th><th>R</th><th>P&L</th><th>Reason</th></tr></thead>
      <tbody>
        ${result.trades.slice(0, 12).map((trade) => `
          <tr>
            <td>${trade.id}</td>
            <td>${trade.action}</td>
            <td>${formatValue(trade.entry)}</td>
            <td>${formatValue(trade.exit)}</td>
            <td>${trade.confidence}%</td>
            <td>${trade.rMultiple}</td>
            <td>${formatMoney(trade.pnl)}</td>
            <td>${trade.reason}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="empty-state">No trades passed the strategy filters in this backtest window.</p>';
}

function renderSimulation(simulation) {
  simulationOutput.innerHTML = `
    <article><span>${formatValue(simulation.probabilityPositive)}%</span><small>Positive-path probability</small></article>
    <article><span>${formatValue(simulation.medianReturn)}%</span><small>Median return</small></article>
    <article><span>${formatValue(simulation.worstReturn)}%</span><small>Worst path</small></article>
    <article><span>${formatValue(simulation.bestReturn)}%</span><small>Best path</small></article>
    <article><span>${formatMoney(simulation.projectedCapital)}</span><small>Median projected capital</small></article>
  `;
}

populateControls();
renderSignals();
runStrategyBacktest();
renderPersistentTools();
renderResearchTerminal();
refreshButton.addEventListener('click', () => { renderSignals(); renderAlertAnalytics(); renderPersistentTools(); renderResearchTerminal(); });
segmentSelect.addEventListener('change', () => { renderSignals(); runStrategyBacktest(); renderPersistentTools(); renderResearchTerminal(); });
timeframeSelect.addEventListener('change', () => { renderSignals(); runStrategyBacktest(); renderPersistentTools(); renderResearchTerminal(); });
seedInput.addEventListener('input', () => { renderSignals(); runStrategyBacktest(); renderPersistentTools(); renderResearchTerminal(); });
liveMode.addEventListener('change', () => { renderSignals(); renderAlertAnalytics(); });
presetSelect.addEventListener('change', () => { applyPreset(presetSelect.value); renderSignals(); runStrategyBacktest(); renderResearchTerminal(); });
[minConfidenceInput, minLiquidityInput, maxSpreadInput, riskRewardInput, riskPerTradeInput, maxTradesInput].forEach((input) => {
  input.addEventListener('input', () => { updateStrategyDescription(); renderSignals(); renderAlertAnalytics(); });
});
backtestButton.addEventListener('click', runStrategyBacktest);
simulationButton.addEventListener('click', () => {
  if (!latestBacktest) runStrategyBacktest();
  renderSimulation(runMonteCarloSimulation(latestBacktest, { paths: 500, seed: Number(seedInput.value || 1) + 900 }));
});
customAlertForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await postJson('/api/custom-alert-rules', {
    symbol: document.querySelector('#alertSymbol').value,
    condition: document.querySelector('#alertCondition').value,
    threshold: document.querySelector('#alertThreshold').value,
    note: document.querySelector('#alertNote').value,
  });
  customAlertForm.reset();
  await renderCustomAlertRules();
});
customAlertRulesEl.addEventListener('click', async (event) => {
  const id = event.target.dataset.deleteRule;
  if (id) {
    await deleteResource(`/api/custom-alert-rules?id=${encodeURIComponent(id)}`);
    await renderCustomAlertRules();
  }
});
portfolioTradeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await postJson('/api/portfolio/trades', {
    symbol: document.querySelector('#tradeSymbol').value,
    side: document.querySelector('#tradeSide').value,
    quantity: document.querySelector('#tradeQuantity').value,
    entryPrice: document.querySelector('#tradeEntry').value,
    exitPrice: document.querySelector('#tradeExit').value,
    signalId: document.querySelector('#tradeSignalId').value,
    note: document.querySelector('#tradeNote').value,
  });
  portfolioTradeForm.reset();
  await renderPortfolioTracker();
});
portfolioTradesEl.addEventListener('click', async (event) => {
  const id = event.target.dataset.deleteTrade;
  if (id) {
    await deleteResource(`/api/portfolio/trades?id=${encodeURIComponent(id)}`);
    await renderPortfolioTracker();
  }
});
setInterval(() => {
  if (liveMode.checked) {
    renderSignals();
    renderAlertAnalytics();
    renderPersistentTools();
    renderResearchTerminal();
  }
}, 30_000);
