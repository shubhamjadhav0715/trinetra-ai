const express = require('express');
const { getQuote, getHistoricalCandles } = require('../services/fyersService');
const {
  generateSignal,
  calculateRSI,
  calculateMovingAverage,
  extractClosePrices,
} = require('../strategy/strategyEngine');

const router = express.Router();

router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getQuote(symbol);
    const price = Number(quote.price);
    const historical = await getHistoricalCandles(symbol, '15');
    const prices = extractClosePrices(historical);

    const rsi = calculateRSI(prices);
    const maShort = calculateMovingAverage(prices, 5);
    const maLong = calculateMovingAverage(prices, 20);
    const generated = generateSignal({
      symbol,
      candles: historical,
      capital: Number(process.env.CAPITAL_BASE || 100000),
      riskPercent: Number(process.env.MAX_RISK_PER_TRADE || 1),
    });

    return res.status(200).json({
      symbol,
      price: Number.isFinite(price) ? price : null,
      quote,
      indicators: {
        rsi,
        movingAverageShort: maShort,
        movingAverageLong: maLong,
      },
      signal: {
        type: generated.signal,
        entryPrice: generated.entryPrice,
        stopLoss: generated.stopLoss,
        target: generated.target,
        positionSize: generated.positionSize,
        confidence: generated.confidence,
        strategy: generated.strategy,
      },
    });
  } catch (error) {
    return res.status(500).json({
      symbol: req.params.symbol,
      price: null,
      quote: null,
      indicators: {
        rsi: null,
        movingAverageShort: null,
        movingAverageLong: null,
      },
      signal: {
        type: 'HOLD',
        confidence: 0,
        strategy: 'ERROR',
      },
      error: error.message,
    });
  }
});

module.exports = router;
