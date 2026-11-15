# Trinetra AI — Delta Exchange Perpetual Futures Paper Trading Roadmap

## Product goal
Build a crypto derivatives analysis and paper-trading workspace using Delta Exchange India public market data. Initial release is research and simulation only; it must not place live orders or require exchange trading permissions.

## Market configuration
- Market type: perpetual futures (`perpetual_futures`).
- Initial watchlist: BTCUSD and ETHUSD, resolved against the live product catalogue at runtime.
- Public API base: `https://api.india.delta.exchange`.
- Public market data requires no API credentials. Private account and trading endpoints are intentionally out of scope for the initial paper-only release.
- Always read product metadata (product ID, symbol, tick size, minimum size, contract value, fees, margin and leverage fields when supplied) from the API; never hardcode contract specifications.

## Trading styles
- Scalping: 1m, 3m, 5m.
- Intraday: 15m, 30m, 1h.
- Swing: use 1h REST candles initially; aggregate to 4h/1d only after validating candle boundaries and completeness. The public WebSocket candlestick channels document additional intervals.
- Signals must be based on closed candles to avoid look-ahead bias.

## Current backend integration
- `GET /api/crypto/markets`: live perpetual futures product catalogue.
- `GET /api/crypto/tickers`: perpetual futures ticker list.
- `GET /api/crypto/:symbol/ticker`: one product ticker.
- `GET /api/crypto/:symbol/candles?resolution=5m`: historical OHLCV.
- `GET /api/crypto/:symbol/orderbook?depth=20`: public L2 order book.
- `GET /api/crypto/:symbol/funding?resolution=1h`: funding-rate history.
- `GET /api/crypto/:symbol/open-interest?resolution=5m`: open-interest history.
- `GET /api/crypto/:symbol/mark-price?resolution=5m`: mark-price history.
- Funding-rate history must support negative values; do not run it through positive-price candle validation.
- Existing FYERS routes remain separate.

## Futures risk configuration (paper only)
- Default leverage: 1x; configured paper maximum: 3x.
- Risk per simulated trade: 0.5% of paper equity.
- Daily simulated loss stop: 2% of starting daily paper equity.
- Maximum simultaneous paper positions: 3.
- Keep a 20% margin safety buffer in sizing checks.
- All risk settings are simulation defaults, not personal trading advice. Product-specific contract size, tick size, fee, margin and leverage metadata must be read from Delta's product catalogue when present.

## Delivery phases
### Phase 1 — Delta market-data foundation
- Discover live perpetual futures products dynamically.
- Read tickers, OHLC candles, L2 order book, funding-rate, mark-price and open-interest history.
- Normalize and validate data, sort candles, remove duplicate timestamps, and preserve negative funding rates.
- Display provider, timestamp, and stale/error states.

### Phase 2 — Futures strategy engine
- Audit and test RSI, moving averages, MACD, and Bollinger calculations.
- Add trend/momentum, mean-reversion, breakout, and Fair Value Gap strategies.
- Add futures context: funding, open interest, mark/last price divergence, and order-book imbalance.
- Signals include strategy, symbol, side (long/short), timeframe, entry zone, invalidation, stop, target, rationale, and closed-candle timestamp.
- Do not generate a signal from an unfinished candle.

### Phase 3 — Futures backtesting
- Model contract sizing, tick size, maker/taker fees, funding payments, and configurable slippage.
- Report net P&L, win rate, profit factor, max drawdown, trade count, average R multiple, and funding/fee breakdown.
- Keep in-sample and out-of-sample periods separate.

### Phase 4 — Paper trading
- Simulate long/short entries and exits, leverage, isolated-margin assumptions, fees, funding, slippage, stops, targets, and liquidation-risk warnings.
- Persist simulated orders, fills, positions, equity and risk events.
- Enforce daily loss limits, maximum positions, position sizing, and duplicate-order prevention.
- No live order placement, private account access, or exchange trading keys in this phase.

### Phase 5 — Dashboard and journal
- Futures watchlist, charts, funding/OI panels, order-book view, strategy signals, paper positions, history, analytics, and journal.
- Clearly label all balances and P&L as simulated.

## Safety defaults
- `TRADING_MODE=paper` only; `allowLiveOrders=false`.
- No live order endpoint or trading API credentials.
- Never commit `.env`, access tokens, API secrets, or personal credentials.
- Never infer liquidation price from leverage alone; use product/account-specific margin rules when available and show estimates as estimates.
- A strategy signal is not a recommendation or guarantee of profitability.

## Phase 1 acceptance criteria
- Live perpetual products are discovered rather than assumed.
- Ticker, OHLCV, L2 order book, funding, mark-price and OI data can be fetched.
- Candle validators reject malformed price data while accepting negative funding rates.
- Existing FYERS endpoints continue working unchanged.
- Automated unit tests cover normal candle validation and negative funding data.
