# Trinetra AI — Crypto Paper Trading Roadmap

## Product goal

Build a crypto-market analysis and paper-trading workspace for BTC, ETH, and other configurable spot pairs. The first release is for research and simulation only. It must not place live orders or request exchange trading permissions.

## Current repository baseline

- Frontend: React 19 + Vite, React Router, Lightweight Charts.
- Backend: Node.js + Express, MongoDB/Mongoose.
- Existing backend modules include market data, indicators/strategy analysis, backtesting, risk controls, and trade execution routes.
- Existing market-data integration is FYERS-oriented. Crypto support should be added through a separate provider adapter; do not silently replace or break the existing integration.

## Initial trading styles

The UI should allow the user to select a timeframe appropriate to:
- Scalping: 1m, 3m, 5m
- Intraday: 15m, 30m, 1h
- Swing: 4h, 1d, 1w

These are analysis presets, not promises of profitability. Strategies must be evaluated independently on historical data before paper use.

## Delivery phases

### Phase 1 — Crypto market-data foundation
- Choose a public market-data provider after confirming the user's preferred exchange/data source.
- Normalize symbols, OHLCV candles, timestamps, and timeframes into one internal format.
- Add provider health checks, request validation, rate-limit handling, and clear stale-data/error states.
- Never put API secrets in frontend code or commit real credentials.

### Phase 2 — Indicator and strategy engine
- Audit and test existing RSI, moving-average, MACD, and Bollinger calculations.
- Add independently testable strategies for trend/momentum, range/mean-reversion, breakout, and Fair Value Gap setups.
- Signals must include the strategy name, timeframe, reasoning, invalidation level, and required candle count.
- Avoid look-ahead bias: a signal may use only fully closed candles unless a strategy explicitly documents otherwise.

### Phase 3 — Backtesting
- Use historical OHLCV data with fees and configurable slippage.
- Report net P&L, win rate, profit factor, maximum drawdown, number of trades, and average risk/reward.
- Separate in-sample and out-of-sample periods; do not optimize on the test period.

### Phase 4 — Paper-trading simulator
- Simulate entries, exits, fees, slippage, stop-losses, targets, and open positions.
- Persist every simulated order and trade with timestamps and strategy metadata.
- Enforce risk limits and prevent duplicate orders.
- Clearly label all balances and P&L as simulated.

### Phase 5 — Dashboard and journal
- Add market watchlists, charts, strategy signals, open paper positions, trade history, and performance analytics.
- Display data source and last-updated time.
- Add exportable trade journal and configurable alerts.

## Safety defaults

- TRADING_MODE=paper is the only supported mode in the initial release.
- No live order endpoint, exchange withdrawal permission, or live API credential is required.
- Paper trading must be visibly distinguished from real trading.
- Risk controls must reject invalid or oversized orders; a strategy signal is not a recommendation or guarantee.
- Never commit .env, access tokens, API secrets, or personal credentials.

## Phase 1 acceptance criteria

- The selected public data provider can return normalized OHLCV candles for at least BTC and ETH.
- Candle validation rejects missing, malformed, out-of-order, or non-positive OHLC values.
- The API reports provider errors and stale data without inventing prices.
- Automated tests cover normalization and validation.
- Existing FYERS routes continue to work unchanged.