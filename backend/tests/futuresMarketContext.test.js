const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectFairValueGaps,
  analyzeFundingRate,
  analyzeOpenInterest,
  calculateOrderBookImbalance,
} = require('../strategy/futuresMarketContext');

test('detects a bullish three-candle fair value gap', () => {
  const gaps = detectFairValueGaps([
    { timestamp: 1, high: 100, low: 98 },
    { timestamp: 2, high: 104, low: 101 },
    { timestamp: 3, high: 103, low: 101 },
  ]);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].type, 'BULLISH_FVG');
  assert.equal(gaps[0].lower, 100);
  assert.equal(gaps[0].upper, 101);
});

test('detects a bearish three-candle fair value gap', () => {
  const gaps = detectFairValueGaps([
    { timestamp: 1, high: 105, low: 102 },
    { timestamp: 2, high: 104, low: 99 },
    { timestamp: 3, high: 101, low: 100 },
  ]);
  assert.equal(gaps[0].type, 'BEARISH_FVG');
  assert.equal(gaps[0].lower, 101);
  assert.equal(gaps[0].upper, 102);
});

test('describes positive and negative funding without treating it as a trade signal', () => {
  assert.equal(analyzeFundingRate(0.0001).bias, 'POSITIVE');
  assert.equal(analyzeFundingRate(-0.0001).bias, 'NEGATIVE');
  assert.equal(analyzeFundingRate(null).bias, 'UNKNOWN');
});

test('compares open interest with price direction', () => {
  assert.equal(analyzeOpenInterest({ previous: 100, current: 110, priceChangePercent: 2 }).bias, 'BUILDING_LONG_INTEREST');
  assert.equal(analyzeOpenInterest({ previous: 100, current: 110, priceChangePercent: -2 }).bias, 'BUILDING_SHORT_INTEREST');
});

test('calculates bid versus ask order-book imbalance', () => {
  const result = calculateOrderBookImbalance({
    buy: [[100, 8], [99, 2]],
    sell: [[101, 2]],
  });
  assert.equal(result.bias, 'BID_HEAVY');
  assert.equal(result.imbalance, 0.8);
});
