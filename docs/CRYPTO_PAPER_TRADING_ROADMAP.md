# Trinetra AI — Delta Exchange Crypto Paper Trading Roadmap

## Product goal
Build a crypto-market analysis and paper-trading workspace using Delta Exchange India public market data. Initial release is research and simulation only; it must not place live orders or require exchange trading permissions.

## Repository baseline
- Frontend: React 19 + Vite, React Router, Lightweight Charts.
- Backend: Node.js + Express, MongoDB/Mongoose.
- Existing FYERS-oriented modules remain separate and must not be broken.
- Delta Exchange India public market data uses https://api.india.delta.exchange and does not require API credentials.

## Trading styles and timeframes
- Scalping: 1m, 3m, 5m.
- Intraday: 15m, 30m, 1h.
- Swing: 1h candles initially; aggregate to 4h and 1d after validating candle boundaries and completeness.
- Product symbols must be discovered from the live product catalogue; do not assume BTCUSD, BTC_INR, or any symbol is currently listed.

## Delivery phases
### Phase 1 — Delta market-data foundation
- Discover live products from GET /v2/products.
- Read tickers from GET /v2/tickers and individual ticker details from GET /v2/tickers/{symbol}.
- Read OHLC candles from GET /v2/history/candles using Unix timestamps in seconds.
- Read depth from GET /v2/l2orderbook/{symbol}.
- Normalize all data, validate OHLC values, sort candles, and reject malformed inputs.
- Show provider and last-updated timestamp; surface errors rather than inventing prices.

### Phase 2 — Strategy engine
- Audit and test RSI, moving averages, MACD, and Bollinger calculations.
- Add momentum/trend, mean-reversion, breakout, and Fair Value Gap strategies.
- Signals include strategy, symbol, timeframe, reasoning, invalidation, and closed-candle timestamp.
- Prevent look-ahead bias by using completed candles only.

### Phase 3 — Backtesting
- Include realistic fees and configurable slippage.
- Report net P&L, win rate, profit factor, max drawdown, trade count, and average risk/reward.
- Keep in-sample and out-of-sample periods separate.

### Phase 4 — Paper trading
- Simulate entries, exits, fees, slippage, stop-losses, targets, and open positions.
- Persist every simulated order/trade and enforce risk limits.
- Label all balances and P&L as simulated.
- Do not add live order placement in this phase.

### Phase 5 — Dashboard and journal
- Watchlist, charts, strategy signals, open paper positions, history, analytics, export, and alerts.
- Display data source and last-updated time.

## Safety defaults
- TRADING_MODE=paper only.
- No live order endpoint or trading API credentials are needed.
- Never commit .env, access tokens, API secrets, or personal credentials.
- A strategy signal is not a recommendation or guarantee of profitability.

## Phase 1 acceptance criteria
- Live product catalogue and tickers are accessible.
- Historical OHLC candles can be fetched for a listed product.
- Candle validation rejects malformed or invalid OHLC data.
- Existing FYERS endpoints continue working unchanged.
