const axios = require('axios');
const { generateSignal } = require('./strategyEngine');

const FYERS_BASE_URL = process.env.FYERS_BASE_URL || 'https://api-t1.fyers.in/api/v3';

const getFyersHeaders = () => {
  const { FYERS_APP_ID, FYERS_SECRET, FYERS_ACCESS_TOKEN } = process.env;

  if (!FYERS_APP_ID || !FYERS_SECRET || !FYERS_ACCESS_TOKEN) {
    throw new Error('Missing FYERS credentials in environment variables.');
  }

  return {
    Authorization: `Bearer ${FYERS_ACCESS_TOKEN}`,
    'X-FYERS-APP-ID': FYERS_APP_ID,
    'X-FYERS-SECRET': FYERS_SECRET,
    'Content-Type': 'application/json',
  };
};

const toUnixSeconds = (value) => Math.floor(new Date(value).getTime() / 1000);

const normalizeCandle = (candle) => ({
  time: candle[0],
  open: Number(candle[1]),
  high: Number(candle[2]),
  low: Number(candle[3]),
  close: Number(candle[4]),
  volume: Number(candle[5]),
});

const fetchHistoricalOHLC = async (symbol, options = {}) => {
  const {
    resolution = 'D',
    from = '2025-01-01',
    to = new Date().toISOString().slice(0, 10),
    dateFormat = '1',
    contFlag = '1',
  } = options;

  const response = await axios.get(`${FYERS_BASE_URL}/data/history`, {
    headers: getFyersHeaders(),
    params: {
      symbol,
      resolution,
      date_format: dateFormat,
      range_from: toUnixSeconds(from),
      range_to: toUnixSeconds(to),
      cont_flag: contFlag,
    },
  });

  const payload = response.data || {};
  const candles = Array.isArray(payload.candles) ? payload.candles : [];
  return candles.map(normalizeCandle);
};

const computeMetrics = (trades) => {
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const grossProfit = trades
    .filter((trade) => trade.profit > 0)
    .reduce((sum, trade) => sum + trade.profit, 0);
  const grossLoss = trades
    .filter((trade) => trade.profit < 0)
    .reduce((sum, trade) => sum + trade.profit, 0);
  const netProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);

  let runningEquity = 0;
  let peakEquity = 0;
  let maxDrawdown = 0;

  trades.forEach((trade) => {
    runningEquity += trade.profit;
    peakEquity = Math.max(peakEquity, runningEquity);
    const drawdown = peakEquity - runningEquity;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  return {
    totalTrades,
    winRate: totalTrades ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0,
    profitFactor:
      grossLoss === 0
        ? grossProfit > 0
          ? Infinity
          : 0
        : Number((grossProfit / Math.abs(grossLoss)).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  };
};

const runBacktest = async (symbol, options = {}) => {
  const candles = await fetchHistoricalOHLC(symbol, options);
  if (!candles.length) {
    return {
      symbol,
      trades: [],
      metrics: {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        netProfit: 0,
      },
    };
  }

  const trades = [];
  let openTrade = null;

  for (let i = 20; i < candles.length; i += 1) {
    const window = candles.slice(0, i + 1);
    const prices = window.map((candle) => candle.close);
    const current = candles[i];
    const signal = generateSignal({ symbol, prices });

    if (signal.signal === 'BUY' && !openTrade) {
      openTrade = {
        symbol,
        entryPrice: current.close,
        entryTime: current.time,
      };
      continue;
    }

    if (signal.signal === 'SELL' && openTrade) {
      const exitPrice = current.close;
      const tradeDuration = current.time - openTrade.entryTime;
      const profit = exitPrice - openTrade.entryPrice;

      trades.push({
        symbol,
        entryPrice: Number(openTrade.entryPrice.toFixed(2)),
        exitPrice: Number(exitPrice.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        tradeDuration,
      });

      openTrade = null;
    }
  }

  if (openTrade) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const tradeDuration = lastCandle.time - openTrade.entryTime;
    const profit = exitPrice - openTrade.entryPrice;

    trades.push({
      symbol,
      entryPrice: Number(openTrade.entryPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      tradeDuration,
    });
  }

  return {
    symbol,
    trades,
    metrics: computeMetrics(trades),
  };
};

module.exports = {
  fetchHistoricalOHLC,
  runBacktest,
};
