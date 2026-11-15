const detectFairValueGaps = (candles = []) => {
  if (!Array.isArray(candles) || candles.length < 3) return [];
  const gaps = [];
  for (let index = 2; index < candles.length; index += 1) {
    const first = candles[index - 2];
    const third = candles[index];
    const firstHigh = Number(first.high);
    const firstLow = Number(first.low);
    const thirdHigh = Number(third.high);
    const thirdLow = Number(third.low);
    if (![firstHigh, firstLow, thirdHigh, thirdLow].every(Number.isFinite)) continue;

    if (thirdLow > firstHigh) {
      gaps.push({
        type: 'BULLISH_FVG',
        lower: firstHigh,
        upper: thirdLow,
        midpoint: (firstHigh + thirdLow) / 2,
        formedAt: Number(third.timestamp),
      });
    } else if (thirdHigh < firstLow) {
      gaps.push({
        type: 'BEARISH_FVG',
        lower: thirdHigh,
        upper: firstLow,
        midpoint: (thirdHigh + firstLow) / 2,
        formedAt: Number(third.timestamp),
      });
    }
  }
  return gaps;
};

const analyzeFundingRate = (fundingRate) => {
  const value = Number(fundingRate);
  if (!Number.isFinite(value)) return { value: null, bias: 'UNKNOWN', note: 'Funding rate unavailable.' };
  if (value > 0) return { value, bias: 'POSITIVE', note: 'Longs pay shorts; positive funding can indicate crowded long positioning.' };
  if (value < 0) return { value, bias: 'NEGATIVE', note: 'Shorts pay longs; negative funding can indicate crowded short positioning.' };
  return { value, bias: 'NEUTRAL', note: 'Funding rate is neutral.' };
};

const analyzeOpenInterest = ({ previous, current, priceChangePercent } = {}) => {
  const before = Number(previous);
  const now = Number(current);
  const priceChange = Number(priceChangePercent);
  if (![before, now].every(Number.isFinite) || before <= 0 || now < 0) {
    return { change: null, changePercent: null, bias: 'UNKNOWN', note: 'Open-interest history unavailable or invalid.' };
  }
  const change = now - before;
  const changePercent = (change / before) * 100;
  let bias = 'MIXED';
  if (change > 0 && Number.isFinite(priceChange) && priceChange > 0) bias = 'BUILDING_LONG_INTEREST';
  else if (change > 0 && Number.isFinite(priceChange) && priceChange < 0) bias = 'BUILDING_SHORT_INTEREST';
  else if (change < 0) bias = 'OPEN_INTEREST_FALLING';
  return {
    change: Number(change.toFixed(8)),
    changePercent: Number(changePercent.toFixed(4)),
    bias,
    note: 'Open interest is contextual information, not a directional signal by itself.',
  };
};

const calculateOrderBookImbalance = (orderBook) => {
  const sumSize = (levels = []) => levels.reduce((total, level) => {
    const size = Number(Array.isArray(level) ? level[1] : level?.size ?? level?.quantity ?? level?.volume);
    return total + (Number.isFinite(size) && size > 0 ? size : 0);
  }, 0);
  const bids = sumSize(orderBook?.buy);
  const asks = sumSize(orderBook?.sell);
  const total = bids + asks;
  if (!total) return { bidSize: bids, askSize: asks, imbalance: null, bias: 'UNKNOWN' };
  const imbalance = (bids - asks) / total;
  return {
    bidSize: bids,
    askSize: asks,
    imbalance: Number(imbalance.toFixed(4)),
    bias: imbalance > 0.1 ? 'BID_HEAVY' : imbalance < -0.1 ? 'ASK_HEAVY' : 'BALANCED',
  };
};

module.exports = {
  detectFairValueGaps,
  analyzeFundingRate,
  analyzeOpenInterest,
  calculateOrderBookImbalance,
};
