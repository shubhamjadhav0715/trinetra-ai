const calculatePositionSize = (capital, riskPercent, entryPrice, stopLoss) => {
  const safeCapital = Number(capital);
  const safeRiskPercent = Number(riskPercent);
  const safeEntry = Number(entryPrice);
  const safeStop = Number(stopLoss);

  if (
    !Number.isFinite(safeCapital) ||
    !Number.isFinite(safeRiskPercent) ||
    !Number.isFinite(safeEntry) ||
    !Number.isFinite(safeStop) ||
    safeCapital <= 0 ||
    safeRiskPercent <= 0
  ) {
    return 0;
  }

  const riskAmount = (safeCapital * safeRiskPercent) / 100;
  const riskPerUnit = Math.abs(safeEntry - safeStop);

  if (!Number.isFinite(riskPerUnit) || riskPerUnit <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(riskAmount / riskPerUnit));
};

const checkDailyLoss = (currentPnL, maxLoss) => {
  const pnl = Number(currentPnL);
  const allowedLoss = Number(maxLoss);

  if (!Number.isFinite(pnl) || !Number.isFinite(allowedLoss) || allowedLoss <= 0) {
    return false;
  }

  return Math.abs(Math.min(0, pnl)) >= allowedLoss;
};

const validateOrder = (order, portfolio, riskSettings) => {
  const errors = [];

  const {
    maxRiskPerTrade = 1,
    maxDailyLoss = 3,
    maxOpenTrades = 5,
    maxSymbolExposure = 40,
    capital = 100000,
  } = riskSettings || {};

  const {
    quantity = 0,
    entryPrice = 0,
    stopLoss = 0,
    symbol = '',
  } = order || {};

  const openTrades = Number(portfolio?.openTrades || 0);
  const symbolExposurePercent = Number(portfolio?.symbolExposurePercent || 0);
  const currentPnLPercent = Number(portfolio?.currentPnLPercent || 0);

  const riskPerUnit = Math.abs(Number(entryPrice) - Number(stopLoss));
  const riskAmount = Number(quantity) * riskPerUnit;
  const riskPercentPerTrade = capital > 0 ? (riskAmount / capital) * 100 : 0;

  if (openTrades >= maxOpenTrades) {
    errors.push(`Max open trades limit reached (${maxOpenTrades}).`);
  }

  if (riskPercentPerTrade > maxRiskPerTrade) {
    errors.push(
      `Risk per trade ${riskPercentPerTrade.toFixed(2)}% exceeds max ${maxRiskPerTrade}%.`,
    );
  }

  if (symbolExposurePercent > maxSymbolExposure) {
    errors.push(
      `Symbol exposure for ${symbol} is ${symbolExposurePercent.toFixed(
        2,
      )}% and exceeds max ${maxSymbolExposure}%.`,
    );
  }

  if (checkDailyLoss(currentPnLPercent, maxDailyLoss)) {
    errors.push(
      `Daily loss limit reached (${currentPnLPercent.toFixed(2)}% vs ${maxDailyLoss}%).`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    risk: {
      riskAmount: Number(riskAmount.toFixed(2)),
      riskPercentPerTrade: Number(riskPercentPerTrade.toFixed(2)),
    },
  };
};

module.exports = {
  calculatePositionSize,
  validateOrder,
  checkDailyLoss,
};
