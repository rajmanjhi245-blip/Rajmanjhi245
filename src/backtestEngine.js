import { MARKET_SEGMENTS, analyzeSignal, createMarketSnapshot, seededNoise, round } from './signalEngine.js';
import { buildStrategy } from './strategyEngine.js';

const DEFAULT_COSTS = {
  brokerageBps: 3,
  slippageBps: 4,
};

export function runBacktest({
  segmentId = 'india-equity',
  symbol,
  timeframe = '15m',
  bars = 120,
  seed = 245,
  startingCapital = 100000,
  strategy = {},
  costs = DEFAULT_COSTS,
} = {}) {
  const segment = MARKET_SEGMENTS.find((item) => item.id === segmentId) || MARKET_SEGMENTS[0];
  const selectedSymbol = symbol || segment.assets[0];
  const builtStrategy = buildStrategy(strategy);
  const trades = [];
  const equityCurve = [{ index: 0, equity: round(startingCapital), drawdown: 0 }];
  let equity = startingCapital;
  let peakEquity = startingCapital;

  for (let index = 1; index <= bars && trades.length < builtStrategy.maxTrades; index += 1) {
    const snapshot = createMarketSnapshot({
      symbol: selectedSymbol,
      segment: segment.label,
      timeframe,
      seed: seed + index,
    });
    const signal = analyzeSignal(snapshot, builtStrategy);
    const exit = simulateTradeExit(signal, seed + index * 3, builtStrategy, costs);

    if (exit) {
      const riskAmount = equity * (builtStrategy.riskPerTrade / 100);
      const pnl = riskAmount * exit.rMultiple;
      equity += pnl;
      peakEquity = Math.max(peakEquity, equity);
      const drawdown = peakEquity === 0 ? 0 : ((peakEquity - equity) / peakEquity) * 100;
      trades.push({
        id: trades.length + 1,
        bar: index,
        action: signal.action,
        entry: signal.entry,
        exit: exit.price,
        stopLoss: signal.stopLoss,
        target: signal.targets[0],
        confidence: signal.confidence,
        riskGrade: signal.riskGrade,
        rMultiple: round(exit.rMultiple, 3),
        pnl: round(pnl),
        reason: exit.reason,
      });
      equityCurve.push({ index, equity: round(equity), drawdown: round(drawdown) });
    }
  }

  return summarizeBacktest({
    segment: segment.label,
    symbol: selectedSymbol,
    timeframe,
    bars,
    seed,
    startingCapital,
    endingCapital: equity,
    trades,
    equityCurve,
    strategy: builtStrategy,
  });
}

export function simulateTradeExit(signal, seed, strategy, costs = DEFAULT_COSTS) {
  if (signal.action === 'WAIT') return null;
  const direction = signal.action === 'BUY' ? 1 : -1;
  const riskDistance = Math.abs(signal.entry - signal.stopLoss) || signal.entry * 0.005;
  const rewardDistance = riskDistance * strategy.riskReward;
  const targetPrice = signal.entry + direction * rewardDistance;
  const quality = signal.confidence / 100;
  const marketLuck = seededNoise(seed, 9);
  const followThrough = seededNoise(seed, 10) * 0.44 + quality * 0.56;
  const costR = ((costs.brokerageBps + costs.slippageBps) / 10000) * signal.entry / riskDistance;
  const isWin = followThrough > 0.44 + (marketLuck * 0.22);
  const rMultiple = isWin ? strategy.riskReward - costR : -1 - costR;

  return {
    price: round(isWin ? targetPrice : signal.stopLoss),
    rMultiple,
    reason: isWin ? 'target hit in simulation' : 'stop hit in simulation',
  };
}

export function summarizeBacktest(result) {
  const wins = result.trades.filter((trade) => trade.rMultiple > 0);
  const losses = result.trades.filter((trade) => trade.rMultiple <= 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const maxDrawdown = result.equityCurve.reduce((max, point) => Math.max(max, point.drawdown), 0);
  const totalPnl = result.endingCapital - result.startingCapital;
  const expectancy = result.trades.length
    ? result.trades.reduce((sum, trade) => sum + trade.rMultiple, 0) / result.trades.length
    : 0;

  return {
    ...result,
    endingCapital: round(result.endingCapital),
    totalPnl: round(totalPnl),
    totalReturn: round((totalPnl / result.startingCapital) * 100),
    tradeCount: result.trades.length,
    winRate: result.trades.length ? round((wins.length / result.trades.length) * 100) : 0,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : round(grossProfit / grossLoss, 2),
    expectancyR: round(expectancy, 3),
    maxDrawdown: round(maxDrawdown),
  };
}

export function runMonteCarloSimulation(backtest, { paths = 200, seed = 99 } = {}) {
  if (!backtest.trades.length) {
    return { paths, bestReturn: 0, medianReturn: 0, worstReturn: 0, probabilityPositive: 0, projectedCapital: backtest.startingCapital };
  }

  const returns = Array.from({ length: paths }, (_, pathIndex) => {
    let capital = backtest.startingCapital;
    for (let tradeIndex = 0; tradeIndex < backtest.trades.length; tradeIndex += 1) {
      const pick = Math.floor(seededNoise(seed + pathIndex * 17 + tradeIndex, 12) * backtest.trades.length);
      const trade = backtest.trades[pick];
      capital += capital * (backtest.strategy.riskPerTrade / 100) * trade.rMultiple;
    }
    return ((capital - backtest.startingCapital) / backtest.startingCapital) * 100;
  }).sort((a, b) => a - b);

  const median = returns[Math.floor(returns.length / 2)];
  const positive = returns.filter((value) => value > 0).length;

  return {
    paths,
    bestReturn: round(returns[returns.length - 1]),
    medianReturn: round(median),
    worstReturn: round(returns[0]),
    probabilityPositive: round((positive / paths) * 100),
    projectedCapital: round(backtest.startingCapital * (1 + median / 100)),
  };
}
