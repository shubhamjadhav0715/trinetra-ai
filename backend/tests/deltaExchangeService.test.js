const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCandle, normalizeCandles } = require('../services/deltaExchangeService');

test('normalizes a valid futures candle', () => {
  assert.deepEqual(normalizeCandle({
    time: 1700000000, open: '100', high: '110', low: '95', close: '105', volume: '12',
  }), {
    timestamp: 1700000000, open: 100, high: 110, low: 95, close: 105, volume: 12,
  });
});

test('rejects impossible OHLC values', () => {
  assert.equal(normalizeCandle({
    time: 1700000000, open: 100, high: 90, low: 95, close: 105, volume: 1,
  }), null);
});

test('sorts candles and removes duplicate timestamps', () => {
  const result = normalizeCandles({ success: true, result: [
    { time: 1700000060, open: 101, high: 103, low: 99, close: 102, volume: 2 },
    { time: 1700000000, open: 100, high: 102, low: 98, close: 101, volume: 1 },
    { time: 1700000000, open: 100, high: 102, low: 98, close: 101, volume: 1 },
  ] });
  assert.equal(result.length, 2);
  assert.ok(result[0].timestamp < result[1].timestamp);
});

test('rejects a malformed API envelope', () => {
  assert.throws(() => normalizeCandles({ success: false, error: { message: 'bad' } }), /bad/);
});

test('accepts negative funding-rate metric candles', () => {
  const { normalizeMetricCandles } = require('../services/deltaExchangeService');
  const result = normalizeMetricCandles({ success: true, result: [
    { time: 1700000000, open: -0.01, high: -0.005, low: -0.02, close: -0.015, volume: 0 },
  ] });
  assert.equal(result.length, 1);
  assert.equal(result[0].close, -0.015);
});
