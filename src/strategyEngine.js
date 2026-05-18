export const STRATEGY_PRESETS = {
  balanced: {
    id: 'balanced',
    name: 'Balanced Institutional',
    minConfidence: 63,
    minLiquidity: 45,
    maxSpreadRisk: 72,
    riskReward: 1.6,
    riskPerTrade: 1,
    maxTrades: 12,
    weights: {
      flow: 0.34,
      trend: 0.28,
      sentiment: 0.2,
      skew: 0.18,
    },
  },
  conservative: {
    id: 'conservative',
    name: 'Conservative Desk',
    minConfidence: 74,
    minLiquidity: 62,
    maxSpreadRisk: 48,
    riskReward: 2.1,
    riskPerTrade: 0.65,
    maxTrades: 8,
    weights: {
      flow: 0.38,
      trend: 0.26,
      sentiment: 0.18,
      skew: 0.18,
    },
  },
  aggressive: {
    id: 'aggressive',
    name: 'Aggressive Momentum',
    minConfidence: 56,
    minLiquidity: 38,
    maxSpreadRisk: 82,
    riskReward: 1.25,
    riskPerTrade: 1.35,
    maxTrades: 18,
    weights: {
      flow: 0.28,
      trend: 0.38,
      sentiment: 0.18,
      skew: 0.16,
    },
  },
};

export function normalizeWeights(weights = STRATEGY_PRESETS.balanced.weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, Number(value || 0) / total]),
  );
}

export function buildStrategy(overrides = {}) {
  const preset = STRATEGY_PRESETS[overrides.preset] || STRATEGY_PRESETS[overrides.id] || STRATEGY_PRESETS.balanced;
  const strategy = {
    ...preset,
    ...overrides,
    weights: normalizeWeights({ ...preset.weights, ...(overrides.weights || {}) }),
  };
  return validateStrategy(strategy);
}

export function validateStrategy(strategy) {
  const bounded = {
    ...strategy,
    minConfidence: clamp(Number(strategy.minConfidence), 1, 99),
    minLiquidity: clamp(Number(strategy.minLiquidity), 1, 100),
    maxSpreadRisk: clamp(Number(strategy.maxSpreadRisk), 1, 100),
    riskReward: clamp(Number(strategy.riskReward), 0.25, 5),
    riskPerTrade: clamp(Number(strategy.riskPerTrade), 0.1, 5),
    maxTrades: Math.round(clamp(Number(strategy.maxTrades), 1, 100)),
    weights: normalizeWeights(strategy.weights),
  };
  return bounded;
}

export function describeStrategy(strategy) {
  return `${strategy.name || 'Custom'}: confidence ≥ ${strategy.minConfidence}%, liquidity ≥ ${strategy.minLiquidity}, spread risk ≤ ${strategy.maxSpreadRisk}, RR ${strategy.riskReward}:1, risk ${strategy.riskPerTrade}%/trade.`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
