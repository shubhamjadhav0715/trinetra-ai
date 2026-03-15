const { calculatePositionSize } = require('../risk/riskEngine');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

const calculateRSI = (prices, period = 14) => {
  if (!Array.isArray(prices) || prices.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i += 1) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    if (change < 0) losses += Math.abs(change);
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) {
    return 100;
  }

  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
};

const calculateMovingAverage = (prices, period) => {
  if (!Array.isArray(prices) || !period || prices.length < period) {
    return null;
  }

  const slice = prices.slice(-period);
  const total = slice.reduce((sum, price) => sum + price, 0);
  return total / period;
};

const calculateEMA = (prices, period) => {
  if (!Array.isArray(prices) || prices.length < period || period <= 1) return null;
  const k = 2 / (period + 1);
  let ema = mean(prices.slice(0, period));
  for (let i = period; i < prices.length; i += 1) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
};

const calculateMACD = (prices, fast = 12, slow = 26, signalPeriod = 9) => {
  if (!Array.isArray(prices) || prices.length < slow + signalPeriod) return null;

  const macdLine = [];
  for (let i = 0; i < prices.length; i += 1) {
    const slice = prices.slice(0, i + 1);
    const fastEma = calculateEMA(slice, fast);
    const slowEma = calculateEMA(slice, slow);
    if (fastEma === null || slowEma === null) continue;
    macdLine.push(fastEma - slowEma);
  }

  if (macdLine.length < signalPeriod + 2) return null;

  const signalLine = [];
  for (let i = 0; i < macdLine.length; i += 1) {
    const slice = macdLine.slice(0, i + 1);
    const ema = calculateEMA(slice, signalPeriod);
    if (ema === null) continue;
    signalLine.push(ema);
  }

  if (signalLine.length < 2) return null;

  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const prevMacd = macdLine[macdLine.length - 2];
  const prevSignal = signalLine[signalLine.length - 2];

  return {
    macd,
    signal,
    histogram: macd - signal,
    prevMacd,
    prevSignal,
  };
};

const calculateBollingerBands = (prices, period = 20, stdMult = 2) => {
  if (!Array.isArray(prices) || prices.length < period) return null;
  const window = prices.slice(-period);
  const mid = mean(window);
  const sd = stdDev(window);
  return {
    middle: mid,
    upper: mid + sd * stdMult,
    lower: mid - sd * stdMult,
  };
};

const extractClosePrices = (candles = []) => {
  if (!Array.isArray(candles) || !candles.length) return [];
  return candles
    .map((candle) => Number(candle?.close))
    .filter((value) => Number.isFinite(value));
};

const generateSignal = (marketData) => {
  const symbol = marketData?.symbol || 'UNKNOWN';
  const candles = marketData?.candles;
  const prices = Array.isArray(marketData?.prices) ? marketData.prices : extractClosePrices(candles);
  const shortPeriod = marketData?.shortPeriod || 5;
  const longPeriod = marketData?.longPeriod || 20;
  const forcedStrategy = (marketData?.strategy || 'AUTO').toString().toUpperCase();
  const capital = Number(marketData?.capital || process.env.CAPITAL_BASE || 100000);
  const riskPercent = Number(
    marketData?.riskPercent || process.env.MAX_RISK_PER_TRADE || 1,
  );
  const stopLossPercent = Number(marketData?.stopLossPercent || 1);
  const rewardRiskRatio = Number(marketData?.rewardRiskRatio || 2);

  if (!Array.isArray(prices) || prices.length < longPeriod) {
    return {
      symbol,
      signal: 'HOLD',
      entryPrice: null,
      stopLoss: null,
      target: null,
      confidence: 0.1,
      positionSize: 0,
      strategy: 'INSUFFICIENT_DATA',
    };
  }

  const rsi = calculateRSI(prices, 14);
  const shortMA = calculateMovingAverage(prices, shortPeriod);
  const longMA = calculateMovingAverage(prices, longPeriod);
  const macd = calculateMACD(prices);
  const bb = calculateBollingerBands(prices);

  if (rsi === null || shortMA === null || longMA === null) {
    return {
      symbol,
      signal: 'HOLD',
      entryPrice: null,
      stopLoss: null,
      target: null,
      confidence: 0.1,
      positionSize: 0,
      strategy: 'INSUFFICIENT_DATA',
    };
  }

  const entryPrice = prices[prices.length - 1];
  const calcLevels = (signalType) => {
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return { stopLoss: null, target: null, positionSize: 0 };
    }

    const stopDistance = (entryPrice * stopLossPercent) / 100;
    const stopLoss =
      signalType === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
    const target =
      signalType === 'BUY'
        ? entryPrice + stopDistance * rewardRiskRatio
        : entryPrice - stopDistance * rewardRiskRatio;
    const positionSize = calculatePositionSize(capital, riskPercent, entryPrice, stopLoss);

    return {
      stopLoss: Number(stopLoss.toFixed(2)),
      target: Number(target.toFixed(2)),
      positionSize,
    };
  };

  if (forcedStrategy === 'MACD') {
    if (!macd) {
      return {
        symbol,
        signal: 'HOLD',
        entryPrice: null,
        stopLoss: null,
        target: null,
        confidence: 0.1,
        positionSize: 0,
        strategy: 'INSUFFICIENT_DATA',
      };
    }

    const crossedUp = macd.prevMacd <= macd.prevSignal && macd.macd > macd.signal;
    const crossedDown = macd.prevMacd >= macd.prevSignal && macd.macd < macd.signal;

    if (crossedUp) {
      const levels = calcLevels('BUY');
      const conf = clamp(Math.abs(macd.histogram) / (Math.abs(macd.signal) + 1e-6), 0.5, 0.9);
      return {
        symbol,
        signal: 'BUY',
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: levels.stopLoss,
        target: levels.target,
        confidence: conf,
        positionSize: levels.positionSize,
        strategy: 'MACD',
      };
    }

    if (crossedDown) {
      const levels = calcLevels('SELL');
      const conf = clamp(Math.abs(macd.histogram) / (Math.abs(macd.signal) + 1e-6), 0.5, 0.9);
      return {
        symbol,
        signal: 'SELL',
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: levels.stopLoss,
        target: levels.target,
        confidence: conf,
        positionSize: levels.positionSize,
        strategy: 'MACD',
      };
    }

    return {
      symbol,
      signal: 'HOLD',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: null,
      target: null,
      confidence: 0.5,
      positionSize: 0,
      strategy: 'MACD',
    };
  }

  if (forcedStrategy === 'BOLLINGER') {
    if (!bb) {
      return {
        symbol,
        signal: 'HOLD',
        entryPrice: null,
        stopLoss: null,
        target: null,
        confidence: 0.1,
        positionSize: 0,
        strategy: 'INSUFFICIENT_DATA',
      };
    }

    if (entryPrice < bb.lower) {
      const levels = calcLevels('BUY');
      const conf = clamp((bb.lower - entryPrice) / Math.max(1e-6, bb.middle), 0.5, 0.9);
      return {
        symbol,
        signal: 'BUY',
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: levels.stopLoss,
        target: levels.target,
        confidence: conf,
        positionSize: levels.positionSize,
        strategy: 'BOLLINGER',
      };
    }

    if (entryPrice > bb.upper) {
      const levels = calcLevels('SELL');
      const conf = clamp((entryPrice - bb.upper) / Math.max(1e-6, bb.middle), 0.5, 0.9);
      return {
        symbol,
        signal: 'SELL',
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: levels.stopLoss,
        target: levels.target,
        confidence: conf,
        positionSize: levels.positionSize,
        strategy: 'BOLLINGER',
      };
    }

    return {
      symbol,
      signal: 'HOLD',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: null,
      target: null,
      confidence: 0.5,
      positionSize: 0,
      strategy: 'BOLLINGER',
    };
  }

  if ((forcedStrategy === 'AUTO' || forcedStrategy === 'RSI') && rsi < 30) {
    const levels = calcLevels('BUY');
    return {
      symbol,
      signal: 'BUY',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: levels.stopLoss,
      target: levels.target,
      confidence: clamp((30 - rsi) / 30, 0.5, 0.95),
      positionSize: levels.positionSize,
      strategy: 'RSI',
    };
  }

  if ((forcedStrategy === 'AUTO' || forcedStrategy === 'RSI') && rsi > 70) {
    const levels = calcLevels('SELL');
    return {
      symbol,
      signal: 'SELL',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: levels.stopLoss,
      target: levels.target,
      confidence: clamp((rsi - 70) / 30, 0.5, 0.95),
      positionSize: levels.positionSize,
      strategy: 'RSI',
    };
  }

  if ((forcedStrategy === 'AUTO' || forcedStrategy === 'MA_CROSSOVER') && shortMA > longMA) {
    const levels = calcLevels('BUY');
    return {
      symbol,
      signal: 'BUY',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: levels.stopLoss,
      target: levels.target,
      confidence: clamp((shortMA - longMA) / longMA, 0.5, 0.9),
      positionSize: levels.positionSize,
      strategy: 'MA_CROSSOVER',
    };
  }

  if ((forcedStrategy === 'AUTO' || forcedStrategy === 'MA_CROSSOVER') && shortMA < longMA) {
    const levels = calcLevels('SELL');
    return {
      symbol,
      signal: 'SELL',
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: levels.stopLoss,
      target: levels.target,
      confidence: clamp((longMA - shortMA) / longMA, 0.5, 0.9),
      positionSize: levels.positionSize,
      strategy: 'MA_CROSSOVER',
    };
  }

  return {
    symbol,
    signal: 'HOLD',
    entryPrice: Number(entryPrice.toFixed(2)),
    stopLoss: null,
    target: null,
    confidence: 0.5,
    positionSize: 0,
    strategy: forcedStrategy === 'AUTO' ? 'MA_CROSSOVER' : forcedStrategy,
  };
};

module.exports = {
  calculateRSI,
  calculateMovingAverage,
  calculateMACD,
  calculateBollingerBands,
  extractClosePrices,
  generateSignal,
};
