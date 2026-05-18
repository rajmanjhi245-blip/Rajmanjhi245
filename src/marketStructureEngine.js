import { clamp, round, seededNoise } from './signalEngine.js';

export function generateSyntheticCandles({ seed = 245, bars = 60, basePrice = 1000, volatility = 1.2 } = {}) {
  let close = basePrice * (0.94 + seededNoise(seed, 1) * 0.12);
  return Array.from({ length: bars }, (_, index) => {
    const drift = (seededNoise(seed + index, 2) - 0.48) * volatility;
    const impulse = (seededNoise(seed + index, 3) - 0.5) * volatility * 2.2;
    const open = close;
    close = Math.max(1, open * (1 + (drift + impulse) / 100));
    const wickScale = Math.max(0.15, volatility * (0.35 + seededNoise(seed + index, 4)));
    const high = Math.max(open, close) * (1 + wickScale / 100);
    const low = Math.min(open, close) * (1 - wickScale / 100);
    const volume = round(100000 + seededNoise(seed + index, 5) * 900000);
    return {
      index,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    };
  });
}

export function detectLiquiditySweep(candles, lookback = 16) {
  const latest = candles.at(-1);
  const prior = candles.slice(Math.max(0, candles.length - lookback - 1), -1);
  if (!latest || prior.length < 3) return emptyPattern('Liquidity Sweep');

  const priorHigh = Math.max(...prior.map((bar) => bar.high));
  const priorLow = Math.min(...prior.map((bar) => bar.low));
  const avgVolume = average(prior.map((bar) => bar.volume));
  const range = Math.max(latest.high - latest.low, 0.01);
  const sweptHigh = latest.high > priorHigh && latest.close < priorHigh;
  const sweptLow = latest.low < priorLow && latest.close > priorLow;
  const direction = sweptLow ? 'bullish' : sweptHigh ? 'bearish' : 'none';
  const wickShare = sweptLow
    ? (Math.min(latest.open, latest.close) - latest.low) / range
    : sweptHigh
      ? (latest.high - Math.max(latest.open, latest.close)) / range
      : 0;
  const volumeRatio = avgVolume ? latest.volume / avgVolume : 1;
  const confidence = clamp((wickShare * 55) + (volumeRatio * 25) + (direction === 'none' ? 0 : 20), 0, 99);

  return {
    name: 'Liquidity Sweep',
    detected: direction !== 'none' && confidence >= 55,
    direction,
    level: round(direction === 'bullish' ? priorLow : direction === 'bearish' ? priorHigh : latest.close),
    confidence: round(confidence),
    verdict: direction === 'none'
      ? 'No sweep of resting liquidity detected.'
      : `${direction} sweep of ${direction === 'bullish' ? 'sell-side' : 'buy-side'} liquidity with ${round(volumeRatio, 2)}x volume.`,
  };
}

export function detectBreakOfStructure(candles, lookback = 24) {
  const latest = candles.at(-1);
  const prior = candles.slice(Math.max(0, candles.length - lookback - 1), -1);
  if (!latest || prior.length < 5) return emptyPattern('Break of Structure');

  const swingHigh = Math.max(...prior.map((bar) => bar.high));
  const swingLow = Math.min(...prior.map((bar) => bar.low));
  const bullish = latest.close > swingHigh;
  const bearish = latest.close < swingLow;
  const direction = bullish ? 'bullish' : bearish ? 'bearish' : 'none';
  const breakDistance = bullish
    ? (latest.close - swingHigh) / swingHigh
    : bearish
      ? (swingLow - latest.close) / swingLow
      : 0;
  const confidence = clamp(45 + breakDistance * 4200 + volumeScore(latest, prior), 0, 99);

  return {
    name: 'Break of Structure',
    detected: direction !== 'none',
    direction,
    level: round(bullish ? swingHigh : bearish ? swingLow : latest.close),
    confidence: round(direction === 'none' ? 0 : confidence),
    verdict: direction === 'none'
      ? 'Price has not closed beyond the latest swing structure.'
      : `${direction} close beyond swing ${bullish ? 'high' : 'low'} confirms structure shift.`,
  };
}

export function detectBreakout(candles, lookback = 20) {
  const latest = candles.at(-1);
  const prior = candles.slice(Math.max(0, candles.length - lookback - 1), -1);
  if (!latest || prior.length < 5) return { ...emptyPattern('Breakout'), type: 'none' };

  const rangeHigh = Math.max(...prior.map((bar) => bar.high));
  const rangeLow = Math.min(...prior.map((bar) => bar.low));
  const avgRange = average(prior.map((bar) => bar.high - bar.low));
  const body = Math.abs(latest.close - latest.open);
  const volScore = volumeScore(latest, prior);
  const bullishClose = latest.close > rangeHigh;
  const bearishClose = latest.close < rangeLow;
  const bullishRejection = latest.high > rangeHigh && latest.close <= rangeHigh;
  const bearishRejection = latest.low < rangeLow && latest.close >= rangeLow;
  const expansion = avgRange ? body / avgRange : 0;
  const real = (bullishClose || bearishClose) && expansion >= 0.45 && volScore >= 18;
  const fake = bullishRejection || bearishRejection || ((bullishClose || bearishClose) && !real);
  const direction = bullishClose || bullishRejection ? 'bullish' : bearishClose || bearishRejection ? 'bearish' : 'none';

  return {
    name: 'Breakout',
    detected: real || fake,
    type: real ? 'real' : fake ? 'fake' : 'none',
    direction,
    level: round(direction === 'bullish' ? rangeHigh : direction === 'bearish' ? rangeLow : latest.close),
    confidence: round(clamp((expansion * 45) + volScore + (real ? 30 : fake ? 18 : 0), 0, 99)),
    verdict: real
      ? `Real ${direction} breakout: candle body expanded with volume confirmation.`
      : fake
        ? `Fake ${direction} breakout risk: price failed confirmation or volume/body expansion.`
        : 'No range breakout detected.',
  };
}

export function detectFairValueGaps(candles, minGapRatio = 0.22) {
  if (candles.length < 3) return [];
  const avgRange = average(candles.map((bar) => bar.high - bar.low));
  const gaps = [];

  for (let index = 2; index < candles.length; index += 1) {
    const left = candles[index - 2];
    const impulse = candles[index - 1];
    const right = candles[index];
    const bullishSize = right.low - left.high;
    const bearishSize = left.low - right.high;
    const direction = bullishSize > 0 ? 'bullish' : bearishSize > 0 ? 'bearish' : null;
    const size = direction === 'bullish' ? bullishSize : direction === 'bearish' ? bearishSize : 0;
    const body = Math.abs(impulse.close - impulse.open);
    const real = direction && avgRange > 0 && size / avgRange >= minGapRatio && body / avgRange >= 0.55;

    if (real) {
      const later = candles.slice(index + 1);
      const filled = direction === 'bullish'
        ? later.some((bar) => bar.low <= left.high)
        : later.some((bar) => bar.high >= left.low);
      gaps.push({
        name: 'Fair Value Gap',
        direction,
        from: round(direction === 'bullish' ? left.high : right.high),
        to: round(direction === 'bullish' ? right.low : left.low),
        size: round(size),
        index,
        status: filled ? 'mitigated' : 'active',
        confidence: round(clamp((size / avgRange) * 55 + (body / avgRange) * 35, 0, 99)),
        verdict: `${direction} real FVG ${filled ? 'has been mitigated' : 'remains active'} between imbalance boundaries.`,
      });
    }
  }

  return gaps.slice(-5);
}

export function analyzeMarketStructure({ seed = 245, bars = 60, basePrice = 1000, volatility = 1.2 } = {}) {
  const candles = generateSyntheticCandles({ seed, bars, basePrice, volatility });
  const liquiditySweep = detectLiquiditySweep(candles);
  const breakOfStructure = detectBreakOfStructure(candles);
  const breakout = detectBreakout(candles);
  const fairValueGaps = detectFairValueGaps(candles);
  const latestFvg = fairValueGaps.findLast((gap) => gap.status === 'active') || fairValueGaps.at(-1) || null;
  const bullishVotes = [liquiditySweep, breakOfStructure, breakout, latestFvg].filter((item) => item?.direction === 'bullish').length;
  const bearishVotes = [liquiditySweep, breakOfStructure, breakout, latestFvg].filter((item) => item?.direction === 'bearish').length;
  const bias = bullishVotes > bearishVotes ? 'bullish' : bearishVotes > bullishVotes ? 'bearish' : 'mixed';
  const quality = round(average([
    liquiditySweep.confidence,
    breakOfStructure.confidence,
    breakout.confidence,
    latestFvg?.confidence || 0,
  ]));

  return {
    candles,
    liquiditySweep,
    breakOfStructure,
    breakout,
    fairValueGaps,
    latestFvg,
    bias,
    quality,
    summary: `${bias} structure · sweep ${liquiditySweep.direction} · BOS ${breakOfStructure.direction} · ${breakout.type} breakout · ${latestFvg ? `${latestFvg.direction} FVG` : 'no active FVG'}`,
  };
}

function volumeScore(latest, prior) {
  const avgVolume = average(prior.map((bar) => bar.volume));
  return clamp(((latest.volume / (avgVolume || latest.volume)) - 1) * 50 + 25, 0, 45);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function emptyPattern(name) {
  return {
    name,
    detected: false,
    direction: 'none',
    level: null,
    confidence: 0,
    verdict: `${name} requires more candles.`,
  };
}
