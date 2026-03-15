const TRADING_MODE = (process.env.TRADING_MODE || 'paper').toLowerCase();

const getRiskSettings = () => ({
  maxRiskPerTrade: Number(process.env.MAX_RISK_PER_TRADE || 1),
  maxDailyLoss: Number(process.env.MAX_DAILY_LOSS || 3),
  maxOpenTrades: Number(process.env.MAX_OPEN_TRADES || 5),
  maxSymbolExposure: Number(process.env.MAX_SYMBOL_EXPOSURE || 40),
  capital: Number(process.env.CAPITAL_BASE || 100000),
});

module.exports = {
  TRADING_MODE,
  getRiskSettings,
};
