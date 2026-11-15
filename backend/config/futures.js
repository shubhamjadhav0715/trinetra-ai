const futuresConfig = Object.freeze({
  marketType: 'perpetual_futures',
  tradingMode: 'paper',
  allowLiveOrders: false,
  defaultSymbols: ['BTCUSD', 'ETHUSD'],
  defaultTimeframe: '5m',
  supportedTimeframes: ['1m', '3m', '5m', '15m', '30m', '1h'],
  defaultLeverage: 1,
  maxPaperLeverage: 3,
  riskPerTradePercent: 0.5,
  maxDailyLossPercent: 2,
  maxOpenPositions: 3,
  marginSafetyBufferPercent: 20,
  requireClosedCandles: true,
});

module.exports = futuresConfig;
