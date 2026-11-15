const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateRSI,
  filterClosedCandles,
  generateFuturesSignal,
} = require('../strategy/futuresStrategyEngine');

test('filters the currently forming candle', () => {
  const candles = [
    { timestamp: 900, close: 100 },
    { timestamp: 1200, close: 101 },
    { timestamp: 1500, close: 102 },
  ];
  const closed = filterClosedCandles(candles, '5m', 1500 * 1000 + 1000);
  assert.deepEqual(closed.map((candle) => candle.timestamp), [900, 1200]);
});

test('returns null RSI when there is insufficient history', () => {
  assert.equal(calculateRSI([1, 2, 3], 14), null);
});

test('returns HOLD when there are not enough closed candles', () => {
  const candles = Array.from({ length: 20 }, (_, index) => ({
    timestamp: 1700000000 + index * 300,
    open: 100, high: 102, low: 99, close: 101, volume: 10,
  }));
  const result = generateFuturesSignal({
    symbol: 'BTCUSD', candles, resolution: '5m', nowMs: 1800000000000,
  });
  assert.equal(result.signal, 'HOLD');
  assert.equal(result.tradingMode, 'paper');
  assert.match(result.reason, /at least 35 candles/);
});

test('does not emit a trade signal from flat candles', () => {
  const candles = Array.from({ length: 80 }, (_, index) => ({
    timestamp: 1700000000 + index * 300,
    open: 100, high: 101, low: 99, close: 100, volume: 10,
  }));
  const result = generateFuturesSignal({
    symbol: 'ETHUSD', candles, resolution: '5m', nowMs: 1800000000000,
  });
  assert.equal(result.signal, 'HOLD');
});
