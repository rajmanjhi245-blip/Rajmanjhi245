import { runBacktest, runMonteCarloSimulation } from './backtestEngine.js';
import { analyzeMarketStructure } from './marketStructureEngine.js';
import { MARKET_SEGMENTS, TIMEFRAMES, buildSignals, summarizeSignals } from './signalEngine.js';
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
  const signals = buildSignals({
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

  const structures = signals.map((signal) => ({
    signal,
    structure: analyzeMarketStructure({ seed: signal.sourceSeed, basePrice: signal.entry, volatility: Math.max(0.7, signal.confidence / 35) }),
  }));

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
refreshButton.addEventListener('click', renderSignals);
segmentSelect.addEventListener('change', () => { renderSignals(); runStrategyBacktest(); });
timeframeSelect.addEventListener('change', () => { renderSignals(); runStrategyBacktest(); });
seedInput.addEventListener('input', () => { renderSignals(); runStrategyBacktest(); });
liveMode.addEventListener('change', renderSignals);
presetSelect.addEventListener('change', () => { applyPreset(presetSelect.value); renderSignals(); runStrategyBacktest(); });
[minConfidenceInput, minLiquidityInput, maxSpreadInput, riskRewardInput, riskPerTradeInput, maxTradesInput].forEach((input) => {
  input.addEventListener('input', () => { updateStrategyDescription(); renderSignals(); });
});
backtestButton.addEventListener('click', runStrategyBacktest);
simulationButton.addEventListener('click', () => {
  if (!latestBacktest) runStrategyBacktest();
  renderSimulation(runMonteCarloSimulation(latestBacktest, { paths: 500, seed: Number(seedInput.value || 1) + 900 }));
});
setInterval(() => {
  if (liveMode.checked) renderSignals();
}, 30_000);
