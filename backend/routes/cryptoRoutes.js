const express = require('express');
const {
  getProducts,
  getTickers,
  getTicker,
  getCandles,
  getOrderBook,
} = require('../services/deltaExchangeService');

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

router.get('/:symbol/orderbook', asyncHandler(async (req, res) => {
  const orderBook = await getOrderBook(req.params.symbol, req.query.depth || 20);
  res.json({ provider: 'Delta Exchange India', orderBook });
}));

module.exports = router;
