const Trade = require('../models/Trade');
const { placeOrder } = require('../services/fyersService');
const { validateOrder } = require('../risk/riskEngine');
const { TRADING_MODE, getRiskSettings } = require('../config/trading');
const {
  createPortfolio,
  updatePortfolioOnBuy,
  updatePortfolioOnSell,
  calculateUnrealizedPnL,
} = require('../portfolio/portfolioEngine');

const startOfDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const logOrderEvent = async (trade, status, message, details = {}) => {
  trade.status = status;
  trade.orderEvents.push({ status, message, details, timestamp: new Date() });
  await trade.save();
  console.log(`[OrderEvent] ${trade.symbol} ${status} - ${message}`);
};

const getPortfolioSnapshot = async (symbol, capital) => {
  const openTrades = await Trade.countDocuments({
    status: { $in: ['PENDING', 'PLACED', 'FILLED'] },
    exitPrice: null,
  });

  const openSymbolTrades = await Trade.find({
    symbol,
    status: { $in: ['PENDING', 'PLACED', 'FILLED'] },
    exitPrice: null,
  });

  const symbolExposure = openSymbolTrades.reduce(
    (sum, trade) => sum + Number(trade.entryPrice || 0) * Number(trade.quantity || 0),
    0,
  );

  const todayTrades = await Trade.find({
    timestamp: { $gte: startOfDay() },
  });

  const currentPnL = todayTrades.reduce((sum, trade) => sum + Number(trade.profit || 0), 0);

  return {
    openTrades,
    symbolExposurePercent: capital > 0 ? (symbolExposure / capital) * 100 : 0,
    currentPnLPercent: capital > 0 ? (currentPnL / capital) * 100 : 0,
  };
};

// Demo-grade paper portfolio store (process-local). For multi-user competitions,
// persist this to Mongo and key by user/account.
let paperPortfolio = null;
const getPaperPortfolio = () => {
  if (!paperPortfolio) {
    const riskSettings = getRiskSettings();
    paperPortfolio = createPortfolio(riskSettings.capital);
  }
  return paperPortfolio;
};

const closeLatestOpenTrade = async (symbol, exitPrice, exitTimestamp = new Date()) => {
  const trade = await Trade.findOne({
    symbol,
    side: 'buy',
    status: { $in: ['PENDING', 'PLACED', 'FILLED'] },
    exitPrice: null,
  }).sort({ timestamp: -1 });

  if (!trade) {
    return null;
  }

  trade.exitPrice = exitPrice;
  trade.profit = (exitPrice - trade.entryPrice) * trade.quantity;
  trade.tradeDuration = Math.floor((new Date(exitTimestamp) - new Date(trade.timestamp)) / 1000);
  trade.status = 'FILLED';
  trade.orderEvents.push({
    status: 'FILLED',
    message: 'Position closed',
    details: { exitPrice },
    timestamp: new Date(exitTimestamp),
  });

  await trade.save();
  return trade;
};

const executeSignal = async (signalPayload) => {
  const riskSettings = getRiskSettings();
  const mode = TRADING_MODE === 'live' ? 'live' : 'paper';

  if (!signalPayload || !['BUY', 'SELL', 'HOLD'].includes(signalPayload.signal)) {
    return { success: false, blocked: true, message: 'Invalid signal payload' };
  }

  if (signalPayload.signal === 'HOLD') {
    return { success: true, mode, message: 'No action for HOLD signal' };
  }

  const quantity = Number(signalPayload.positionSize || signalPayload.quantity || 0);
  const entryPrice = Number(signalPayload.entryPrice || 0);
  const stopLoss = Number(signalPayload.stopLoss || 0);
  const symbol = signalPayload.symbol;

  if (signalPayload.signal === 'SELL') {
    const exitPrice = Number(signalPayload.exitPrice || signalPayload.entryPrice || 0);
    if (!symbol || !Number.isFinite(exitPrice) || exitPrice <= 0) {
      return { success: false, blocked: true, message: 'symbol and exitPrice are required for SELL' };
    }

    if (mode === 'paper') {
      const portfolio = getPaperPortfolio();
      try {
        updatePortfolioOnSell(portfolio, { symbol, quantity: Math.max(1, quantity), price: exitPrice });
      } catch (error) {
        // If qty is not provided, fall back to closing the whole position.
        const existingQty = Number(portfolio.positions?.[symbol]?.quantity || 0);
        if (existingQty > 0) {
          updatePortfolioOnSell(portfolio, { symbol, quantity: existingQty, price: exitPrice });
        } else {
          return { success: false, blocked: true, message: error.message };
        }
      }

      const closedTrade = await closeLatestOpenTrade(symbol, exitPrice, new Date());
      const unrealized = calculateUnrealizedPnL(portfolio, { [symbol]: exitPrice });

      return {
        success: true,
        mode,
        message: 'Paper position closed',
        trade: closedTrade,
        portfolio: unrealized,
      };
    }

    const orderData = {
      symbol,
      qty: Math.max(1, quantity),
      type: 2,
      side: -1,
      productType: 'INTRADAY',
      limitPrice: 0,
      stopPrice: 0,
      validity: 'DAY',
      disclosedQty: 0,
      offlineOrder: false,
    };

    const brokerResponse = await placeOrder(orderData);
    return {
      success: true,
      mode,
      message: 'Live SELL order placed',
      brokerResponse,
    };
  }

  const portfolio = await getPortfolioSnapshot(symbol, riskSettings.capital);
  const validation = validateOrder(
    { symbol, quantity, entryPrice, stopLoss },
    portfolio,
    riskSettings,
  );

  if (!validation.isValid) {
    return {
      success: false,
      blocked: true,
      message: 'Risk validation failed',
      errors: validation.errors,
      risk: validation.risk,
    };
  }

  const trade = await Trade.create({
    symbol,
    side: 'buy',
    quantity,
    entryPrice,
    stopLoss: signalPayload.stopLoss,
    target: signalPayload.target,
    strategy: signalPayload.strategy || 'UNKNOWN',
    mode,
    status: 'PENDING',
    riskAmount: validation.risk.riskAmount,
    timestamp: new Date(),
  });

  await logOrderEvent(trade, 'PENDING', 'Order created from strategy signal', signalPayload);

  try {
    if (mode === 'paper') {
      await logOrderEvent(trade, 'PLACED', 'Paper order placed');
      await logOrderEvent(trade, 'FILLED', 'Paper order filled instantly', {
        fillPrice: entryPrice,
        quantity,
      });

      const paper = getPaperPortfolio();
      updatePortfolioOnBuy(paper, { symbol, quantity, price: entryPrice });
      const unrealized = calculateUnrealizedPnL(paper, { [symbol]: entryPrice });

      return {
        success: true,
        mode,
        message: 'Paper trade executed',
        trade,
        portfolio: unrealized,
      };
    }

    const orderData = {
      symbol,
      qty: quantity,
      type: 2,
      side: 1,
      productType: 'INTRADAY',
      limitPrice: 0,
      stopPrice: 0,
      validity: 'DAY',
      disclosedQty: 0,
      offlineOrder: false,
      stopLoss: signalPayload.stopLoss || 0,
      takeProfit: signalPayload.target || 0,
    };

    await logOrderEvent(trade, 'PLACED', 'Sending live order to FYERS', orderData);
    const brokerResponse = await placeOrder(orderData);
    trade.orderId = brokerResponse?.id || brokerResponse?.order_id || '';
    await logOrderEvent(trade, 'FILLED', 'Live order acknowledged by broker', brokerResponse);

    return {
      success: true,
      mode,
      message: 'Live order placed',
      trade,
      brokerResponse,
    };
  } catch (error) {
    await logOrderEvent(trade, 'FAILED', 'Order execution failed', {
      error: error.message,
    });
    return {
      success: false,
      mode,
      message: 'Execution failed',
      error: error.message,
      trade,
    };
  }
};

module.exports = {
  executeSignal,
  getPortfolioSnapshot,
};
