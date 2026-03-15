const { getHistoricalCandles } = require('../services/fyersService');
const { generateSignal } = require('../strategy/strategyEngine');

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

const calculateMetrics = (trades, equityCurve, initialCapital) => {
  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const grossProfit = trades
    .filter((trade) => trade.pnl > 0)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = trades
    .filter((trade) => trade.pnl < 0)
    .reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);

  let peak = initialCapital;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point);
    const dd = peak > 0 ? ((peak - point) / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, dd);
  }

  const returns = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prev = equityCurve[i - 1];
    const curr = equityCurve[i];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  const avgReturn = mean(returns);
  const returnStd = stdDev(returns);
  const downsideReturns = returns.filter((value) => value < 0);
  const downsideStd = stdDev(downsideReturns);
  const annualization = Math.sqrt(252);

  const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * annualization : 0;
  const sortinoRatio = downsideStd > 0 ? (avgReturn / downsideStd) * annualization : 0;
  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1] : initialCapital;

  return {
    totalTrades,
    winRate: totalTrades ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0,
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : 0,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(3)),
    sortinoRatio: Number(sortinoRatio.toFixed(3)),
    netProfit: Number((finalEquity - initialCapital).toFixed(2)),
  };
};

const runBacktest = async (options = {}) => {
  const {
    symbol,
    resolution = '15',
    from,
    to,
    initialCapital = 100000,
    riskPercent = 1,
    strategy = 'AUTO',
  } = options;

  const candles = await getHistoricalCandles(symbol, resolution, from, to);
  if (!candles.length) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      netProfit: 0,
      equityCurve: [],
      trades: [],
    };
  }

  const trades = [];
  const equityCurve = [];
  let capital = Number(initialCapital);
  let openTrade = null;
  const closePrices = [];

  equityCurve.push(Number(capital.toFixed(2)));

  for (let i = 0; i < candles.length; i += 1) {
    const currentCandle = candles[i];
    closePrices.push(Number(currentCandle.close));

    // Warm-up period for indicators.
    if (i < 30) {
      const markToMarket = openTrade
        ? capital + (currentCandle.close - openTrade.entryPrice) * openTrade.quantity
        : capital;
      equityCurve.push(Number(markToMarket.toFixed(2)));
      continue;
    }

    const signal = generateSignal({
      symbol,
      candles: candles.slice(0, i + 1),
      prices: closePrices,
      capital,
      riskPercent,
      strategy,
    });

    if (!openTrade && signal.signal === 'BUY' && signal.positionSize > 0) {
      openTrade = {
        symbol,
        entryPrice: signal.entryPrice || currentCandle.close,
        quantity: signal.positionSize,
        stopLoss: signal.stopLoss,
        target: signal.target,
        entryTimestamp: currentCandle.timestamp,
        strategy: signal.strategy,
      };
    } else if (openTrade) {
      const hitStop = Number.isFinite(openTrade.stopLoss) && currentCandle.low <= openTrade.stopLoss;
      const hitTarget = Number.isFinite(openTrade.target) && currentCandle.high >= openTrade.target;
      const sellSignal = signal.signal === 'SELL';

      if (hitStop || hitTarget || sellSignal || i === candles.length - 1) {
        const exitPrice = hitStop
          ? openTrade.stopLoss
          : hitTarget
            ? openTrade.target
            : currentCandle.close;

        const pnl = (exitPrice - openTrade.entryPrice) * openTrade.quantity;
        capital += pnl;

        trades.push({
          symbol: openTrade.symbol,
          entryPrice: Number(openTrade.entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          quantity: openTrade.quantity,
          pnl: Number(pnl.toFixed(2)),
          timestamp: currentCandle.timestamp,
          entryTimestamp: openTrade.entryTimestamp,
          exitTimestamp: currentCandle.timestamp,
          strategy: openTrade.strategy,
        });

        openTrade = null;
      }
    }

    const markToMarket = openTrade
      ? capital + (currentCandle.close - openTrade.entryPrice) * openTrade.quantity
      : capital;
    equityCurve.push(Number(markToMarket.toFixed(2)));
  }

  const metrics = calculateMetrics(trades, equityCurve, initialCapital);

  return {
    totalTrades: metrics.totalTrades,
    winRate: metrics.winRate,
    profitFactor: metrics.profitFactor,
    maxDrawdown: metrics.maxDrawdown,
    sharpeRatio: metrics.sharpeRatio,
    sortinoRatio: metrics.sortinoRatio,
    netProfit: metrics.netProfit,
    equityCurve,
    trades,
  };
};

module.exports = {
  runBacktest,
};
