const express = require('express');
const {
  getProducts,
  getTickers,
  getTicker,
  getCandles,
  getOrderBook,
  getFundingHistory,
  getOpenInterestHistory,
  getMarkPriceHistory,
} = require('../services/deltaExchangeService');

const { generateFuturesSignal, filterClosedCandles } = require('../strategy/futuresStrategyEngine');
const {
  detectFairValueGaps,
  analyzeFundingRate,
  analyzeOpenInterest,
  calculateOrderBookImbalance,
} = require('../strategy/futuresMarketContext');

const router = express.Router();

const asyncHandler = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => {
    const status = /Invalid|Unsupported|must be|not found|too large/i.test(error.message) ? 400 : 502;
    res.status(status).json({
      provider: 'Delta Exchange India',
      error: error.message || 'Market data request failed.',
    });
  });

router.get('/markets', asyncHandler(async (req, res) => {
  const markets = await getProducts({ contractTypes: req.query.contract_types });
  res.json({ provider: 'Delta Exchange India', count: markets.length, markets });
}));

router.get('/tickers', asyncHandler(async (req, res) => {
  const tickers = await getTickers({
    contractTypes: req.query.contract_types,
    underlyingAssetSymbols: req.query.underlying_asset_symbols,
  });
  res.json({ provider: 'Delta Exchange India', count: tickers.length, tickers });
}));

router.get('/:symbol/ticker', asyncHandler(async (req, res) => {
  const ticker = await getTicker(req.params.symbol);
  res.json({ provider: 'Delta Exchange India', ticker });
}));

router.get('/:symbol/candles', asyncHandler(async (req, res) => {
  const result = await getCandles({
    symbol: req.params.symbol,
    resolution: req.query.resolution || '5m',
    start: req.query.start,
    end: req.query.end,
  });
  res.json(result);
}));

router.get('/:symbol/context', asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const resolution = req.query.resolution || '5m';
  const results = await Promise.allSettled([
    getCandles({ symbol, resolution }),
    getTicker(symbol),
    getOrderBook(symbol, 20),
    getFundingHistory({ symbol, resolution: '1h' }),
    getOpenInterestHistory({ symbol, resolution }),
  ]);

  const [marketResult, tickerResult, bookResult, fundingResult, oiResult] = results;
  const closedCandles = marketResult.status === 'fulfilled'
    ? filterClosedCandles(marketResult.value.candles, resolution)
    : [];
  const recentCandles = closedCandles.slice(-2);
  const previousClose = recentCandles.length === 2 ? Number(recentCandles[0].close) : null;
  const currentClose = recentCandles.length === 2 ? Number(recentCandles[1].close) : null;
  const priceChangePercent = previousClose > 0
    ? ((currentClose - previousClose) / previousClose) * 100
    : null;

  const fundingCandles = fundingResult.status === 'fulfilled' ? fundingResult.value.candles : [];
  const oiCandles = oiResult.status === 'fulfilled' ? oiResult.value.candles : [];
  const fundingRate = fundingCandles.length ? fundingCandles[fundingCandles.length - 1].close : null;
  const previousOI = oiCandles.length > 1 ? oiCandles[oiCandles.length - 2].close : null;
  const currentOI = oiCandles.length ? oiCandles[oiCandles.length - 1].close : null;
  const ticker = tickerResult.status === 'fulfilled' ? tickerResult.value : null;
  const orderBook = bookResult.status === 'fulfilled' ? bookResult.value : null;

  res.json({
    provider: 'Delta Exchange India',
    symbol,
    marketType: 'perpetual_futures',
    tradingMode: 'paper',
    resolution,
    lastClosedCandleAt: closedCandles.length
      ? new Date(closedCandles[closedCandles.length - 1].timestamp * 1000).toISOString()
      : null,
    ticker: ticker || { unavailable: true, error: tickerResult.reason?.message },
    fairValueGaps: detectFairValueGaps(closedCandles).slice(-10),
    funding: {
      analysis: analyzeFundingRate(fundingRate),
      availableCandles: fundingCandles.length,
      error: fundingResult.status === 'rejected' ? fundingResult.reason?.message : null,
    },
    openInterest: {
      analysis: analyzeOpenInterest({
        previous: previousOI,
        current: currentOI,
        priceChangePercent,
      }),
      priceChangePercent,
      availableCandles: oiCandles.length,
      error: oiResult.status === 'rejected' ? oiResult.reason?.message : null,
    },
    orderBook: orderBook
      ? calculateOrderBookImbalance(orderBook)
      : { bidSize: 0, askSize: 0, imbalance: null, bias: 'UNKNOWN', error: bookResult.reason?.message },
    dataWarnings: results.flatMap((result, index) => result.status === 'rejected'
      ? [['candles', 'ticker', 'orderBook', 'funding', 'openInterest'][index] + ': ' + result.reason.message]
      : []),
    note: 'Market context for research only. It does not change the strategy signal or place orders.',
  });
}));

router.get('/:symbol/signal', asyncHandler(async (req, res) => {
  const resolution = req.query.resolution || '5m';
  const market = await getCandles({ symbol: req.params.symbol, resolution });
  const riskRewardRatio = req.query.risk_reward
    ? Number(req.query.risk_reward)
    : 2;
  const signal = generateFuturesSignal({
    symbol: req.params.symbol.toUpperCase(),
    candles: market.candles,
    resolution,
    riskRewardRatio,
  });
  res.json({
    provider: 'Delta Exchange India',
    ...signal,
    note: 'Research signal only. Paper mode; no live orders are placed.',
  });
}));

const metricParams = (req) => ({
  symbol: req.params.symbol,
  resolution: req.query.resolution || '5m',
  start: req.query.start,
  end: req.query.end,
});

router.get('/:symbol/funding', asyncHandler(async (req, res) => {
  const result = await getFundingHistory(metricParams(req));
  res.json(result);
}));

router.get('/:symbol/open-interest', asyncHandler(async (req, res) => {
  const result = await getOpenInterestHistory(metricParams(req));
  res.json(result);
}));

router.get('/:symbol/mark-price', asyncHandler(async (req, res) => {
  const result = await getMarkPriceHistory(metricParams(req));
  res.json(result);
}));

router.get('/:symbol/orderbook', asyncHandler(async (req, res) => {
  const orderBook = await getOrderBook(req.params.symbol, req.query.depth || 20);
  res.json({ provider: 'Delta Exchange India', orderBook });
}));

module.exports = router;
