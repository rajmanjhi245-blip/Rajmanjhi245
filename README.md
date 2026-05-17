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
- Adds smart-money structure scanners for liquidity sweeps, break of structure, real breakouts, fake breakouts, and real fair value gaps.
- Adds alert history tracking with RSI, MACD, trend-confluence setup tags and a signal accuracy backtest comparing predicted confidence against historical outcomes.
- Provides JSON endpoints for market metadata, current trading signals, historical alerts, custom alert rules, portfolio trades, P&L summaries, and accuracy backtests.
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

## API endpoints

- `GET /api/market-data` returns supported segments, venues, and assets.
- `GET /api/signals?segmentId=india-equity&timeframe=15m&seed=245` returns enriched current trading signals with indicators and structure metadata.
- `GET /api/alerts/history?segmentId=crypto&timeframe=1h&seed=500` returns deterministic historical alert outcomes.
- `GET /api/accuracy-backtest?segmentId=forex&timeframe=4h&seed=700` returns historical alerts plus confidence-calibration summaries by setup and confidence bucket.
- `GET|POST|DELETE /api/custom-alert-rules` stores symbol-specific price threshold rules in `data/trading-db.json` and evaluates them against current deterministic market prices.
- `GET|POST|DELETE /api/portfolio/trades` stores real trade logs in `data/trading-db.json`; `GET /api/portfolio/pnl` returns realized P&L, open capital, win rate, and position history.

## Live data integration notes

The current implementation ships with deterministic signal, custom-alert, portfolio, alert-history, market-structure, backtest, and simulation engines so it works without broker or exchange credentials. For production use, connect `src/signalEngine.js`, `src/alertEngine.js`, `src/databaseEngine.js`, `src/marketStructureEngine.js`, and `src/backtestEngine.js` to licensed data providers for exchange prices, order flow, options chains, news sentiment, historical candles, corporate actions, and macro/FX feeds. Add broker-side validation, audit logging, kill switches, walk-forward validation, out-of-sample testing, and regulatory review before any real-money use.
