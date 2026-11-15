const INTERVAL_SECONDS = Object.freeze({
  '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600,
});

const emaSeries = (values, period) => {
  if (!Array.isArray(values) || period < 2 || values.length < period) return [];
  const multiplier = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const output = Array(period - 1).fill(null);
  output.push(current);
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * multiplier + current * (1 - multiplier);
    output.push(current);
  }
  return output;
};

const calculateRSI = (values, period = 14) => {
  if (!Array.isArray(values) || values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
};

const filterClosedCandles = (candles, resolution, nowMs = Date.now()) => {
  const interval = INTERVAL_SECONDS[resolution];
  if (!interval) throw new Error('Unsupported resolution.');
  const currentBucket = Math.floor(Math.floor(nowMs / 1000) / interval) * interval;
  return (Array.isArray(candles) ? candles : []).filter((candle) =>
    Number.isFinite(Number(candle?.timestamp)) && Number(candle.timestamp) < currentBucket
  );
};

const calculateATR = (candles, period = 14) => {
  if (!Array.isArray(candles) || candles.length <= period) return null;
  const ranges = [];
  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousClose = Number(candles[index - 1].close);
    const high = Number(candle.high);
    const low = Number(candle.low);
    if (![previousClose, high, low].every(Number.isFinite)) return null;
    ranges.push(Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose)));
  }
  const recent = ranges.slice(-period);
  return recent.reduce((sum, value) => sum + value, 0) / period;
};

const generateFuturesSignal = ({
  symbol,
  candles,
  resolution = '5m',
  nowMs = Date.now(),
  riskRewardRatio = 2,
}) => {
  const closedCandles = filterClosedCandles(candles, resolution, nowMs);
  const closes = closedCandles.map((candle) => Number(candle.close));
  const base = {
    symbol,
    marketType: 'perpetual_futures',
    tradingMode: 'paper',
    resolution,
    candleCount: closedCandles.length,
    signal: 'HOLD',
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    riskRewardRatio,
    indicators: { ema9: null, ema21: null, rsi14: null, atr14: null },
    reason: 'No confirmed setup on closed candles.',
  };

  if (closedCandles.length < 35 || closes.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { ...base, reason: 'Insufficient valid closed-candle data; at least 35 candles are required.' };
  }
  if (!Number.isFinite(riskRewardRatio) || riskRewardRatio < 1 || riskRewardRatio > 5) {
    throw new Error('riskRewardRatio must be between 1 and 5.');
  }

  const fast = emaSeries(closes, 9);
  const slow = emaSeries(closes, 21);
  const last = closes.length - 1;
  const previous = last - 1;
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(closedCandles, 14);
  const ema9 = fast[last];
  const ema21 = slow[last];
  const crossedUp = fast[previous] <= slow[previous] && ema9 > ema21;
  const crossedDown = fast[previous] >= slow[previous] && ema9 < ema21;
  const entryPrice = closes[last];

  const result = {
    ...base,
    indicators: {
      ema9: Number(ema9.toFixed(8)),
      ema21: Number(ema21.toFixed(8)),
      rsi14: Number(rsi.toFixed(2)),
      atr14: atr === null ? null : Number(atr.toFixed(8)),
    },
    evaluatedAt: new Date(nowMs).toISOString(),
    lastClosedCandleAt: new Date(Number(closedCandles[last].timestamp) * 1000).toISOString(),
  };

  if (atr === null || atr <= 0) return { ...result, reason: 'ATR unavailable; risk levels cannot be calculated safely.' };

  const stopDistance = Math.max(atr * 1.5, entryPrice * 0.003);
  if (crossedUp && rsi >= 50 && rsi <= 75) {
    return {
      ...result,
      signal: 'LONG',
      entryPrice,
      stopLoss: Number((entryPrice - stopDistance).toFixed(8)),
      takeProfit: Number((entryPrice + stopDistance * riskRewardRatio).toFixed(8)),
      reason: 'EMA9 crossed above EMA21 on a closed candle and RSI confirms bullish momentum.',
    };
  }
  if (crossedDown && rsi >= 25 && rsi < 50) {
    return {
      ...result,
      signal: 'SHORT',
      entryPrice,
      stopLoss: Number((entryPrice + stopDistance).toFixed(8)),
      takeProfit: Number((entryPrice - stopDistance * riskRewardRatio).toFixed(8)),
      reason: 'EMA9 crossed below EMA21 on a closed candle and RSI confirms bearish momentum.',
    };
  }
  return result;
};

module.exports = {
  INTERVAL_SECONDS,
  emaSeries,
  calculateRSI,
  calculateATR,
  filterClosedCandles,
  generateFuturesSignal,
};
