# Institutional Signal Lab

Institutional Signal Lab is a browser-based trading-signal decision-support prototype for Indian equities, crypto, and forex. It combines institutional-flow, trend, sentiment, options-skew, liquidity, volatility, and spread-risk inputs to produce risk-aware buy, sell, target, stop-loss, call-bias, put-bias, and no-trade outputs.

> Important: no trading software can honestly guarantee 100% accuracy, zero fake signals, or error-free performance in every market and timeframe. This project therefore implements confidence scoring, explicit risk grading, and no-trade filters rather than claiming impossible certainty.

## Features

- Covers Indian equities, crypto, and forex market segments.
- Supports 1m, 3m, 5m, 15m, 1h, 4h, 1D, and 1W timeframes.
- Displays entry, stop-loss, three targets, derivative bias, confidence, risk grade, and rationale.
- Blocks low-quality setups with a `WAIT` signal instead of forcing a buy or sell.
- Includes a strategy builder with balanced, conservative, and aggressive presets plus custom confidence, liquidity, spread-risk, risk/reward, risk-per-trade, and max-trade controls.
- Adds synthetic backtesting with equity, return, win-rate, drawdown, profit-factor, expectancy, and trade-log outputs.
- Adds Monte Carlo simulation paths to estimate best, median, worst, and positive-path outcomes from backtested trades.
- Includes a live-mode simulator that refreshes every 30 seconds and a deterministic replay seed for testing.
- Uses deterministic engines that can be connected to licensed live data APIs later.

## Run locally

```bash
npm start
```

Open <http://localhost:4173>.

## Test

```bash
npm test
```

## Live data integration notes

The current implementation ships with deterministic signal, backtest, and simulation engines so it works without broker or exchange credentials. For production use, connect `src/signalEngine.js` and `src/backtestEngine.js` to licensed data providers for exchange prices, order flow, options chains, news sentiment, historical candles, corporate actions, and macro/FX feeds. Add broker-side validation, audit logging, kill switches, walk-forward validation, out-of-sample testing, and regulatory review before any real-money use.
