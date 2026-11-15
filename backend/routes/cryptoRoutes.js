const express = require('express');
const {
  getMarkets,
  getTickers,
  getTicker,
  getCandles,
} = require('../services/coindcxService');

const router = express.Router();

const asyncHandler = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => {
    const status = /Invalid|Unsupported|must be|not found/i.test(error.message) ? 400 : 502;
    res.status(status).json({
      provider: 'CoinDCX',
      error: error.message || 'Market data request failed.',
    });
  });

router.get('/markets', asyncHandler(async (req, res) => {
  const markets = await getMarkets();
  res.json({ provider: 'CoinDCX', count: markets.length, markets });
}));

router.get('/tickers', asyncHandler(async (req, res) => {
  const tickers = await getTickers();
  res.json({ provider: 'CoinDCX', count: tickers.length, tickers });
}));

router.get('/:symbol/ticker', asyncHandler(async (req, res) => {
  const ticker = await getTicker(req.params.symbol);
  res.json({ provider: 'CoinDCX', ticker });
}));

router.get('/:symbol/candles', asyncHandler(async (req, res) => {
  const result = await getCandles({
    symbol: req.params.symbol,
    interval: req.query.interval || '1m',
    limit: req.query.limit === undefined ? 500 : req.query.limit,
    startTime: req.query.startTime,
    endTime: req.query.endTime,
  });
  res.json(result);
}));

module.exports = router;
