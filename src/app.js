import { MARKET_SEGMENTS, TIMEFRAMES, buildSignals, summarizeSignals } from './signalEngine.js';

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

function populateControls() {
  segmentSelect.innerHTML = MARKET_SEGMENTS
    .map((segment) => `<option value="${segment.id}">${segment.label}</option>`)
    .join('');
  timeframeSelect.innerHTML = TIMEFRAMES
    .map((timeframe) => `<option value="${timeframe}" ${timeframe === '15m' ? 'selected' : ''}>${timeframe}</option>`)
    .join('');
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  return Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function currentSeed() {
  if (!liveMode.checked) return Number(seedInput.value || 1);
  return Math.floor(Date.now() / 30_000);
}

function renderSignals() {
  const seed = currentSeed();
  const signals = buildSignals({
    segmentId: segmentSelect.value,
    timeframe: timeframeSelect.value,
    seed,
  });
  const summary = summarizeSignals(signals);

  buyCount.textContent = summary.BUY;
  sellCount.textContent = summary.SELL;
  waitCount.textContent = summary.WAIT;
  avgConfidence.textContent = `${summary.avgConfidence}%`;
  feedStatus.textContent = liveMode.checked
    ? `Live sentiment simulator refreshed at ${new Date().toLocaleTimeString('en-IN')}. Connect licensed market feeds for production execution.`
    : `Scenario seed ${seed} loaded for deterministic replay and testing.`;

  signalsEl.innerHTML = signals.map((signal) => `
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
      <p class="rationale"><strong>Risk ${signal.riskGrade}</strong> · ${signal.confidence}% · ${signal.rationale}</p>
    </article>
  `).join('');
}

populateControls();
renderSignals();
refreshButton.addEventListener('click', renderSignals);
segmentSelect.addEventListener('change', renderSignals);
timeframeSelect.addEventListener('change', renderSignals);
seedInput.addEventListener('input', renderSignals);
liveMode.addEventListener('change', renderSignals);
setInterval(() => {
  if (liveMode.checked) renderSignals();
}, 30_000);
