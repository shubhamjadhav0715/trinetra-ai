const Trade = require('../models/Trade');
const { validateOrder } = require('../risk/riskEngine');
const { getRiskSettings } = require('../config/trading');

const createTrade = async (req, res) => {
  try {
    const payload = req.body || {};
    const riskSettings = getRiskSettings();

    const openTrades = await Trade.countDocuments({
      status: { $in: ['PENDING', 'PLACED', 'FILLED'] },
      exitPrice: null,
    });
    const openSymbolTrades = await Trade.find({
      symbol: payload.symbol,
      status: { $in: ['PENDING', 'PLACED', 'FILLED'] },
      exitPrice: null,
    });
    const symbolExposure = openSymbolTrades.reduce(
      (sum, trade) => sum + Number(trade.entryPrice || 0) * Number(trade.quantity || 0),
      0,
    );

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayTrades = await Trade.find({ timestamp: { $gte: start } });
    const currentPnL = todayTrades.reduce((sum, trade) => sum + Number(trade.profit || 0), 0);

    const validation = validateOrder(
      {
        symbol: payload.symbol,
        quantity: payload.quantity,
        entryPrice: payload.entryPrice,
        stopLoss: payload.stopLoss,
      },
      {
        openTrades,
        symbolExposurePercent:
          riskSettings.capital > 0 ? (symbolExposure / riskSettings.capital) * 100 : 0,
        currentPnLPercent:
          riskSettings.capital > 0 ? (currentPnL / riskSettings.capital) * 100 : 0,
      },
      riskSettings,
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Risk validation failed',
        errors: validation.errors,
      });
    }

    const trade = await Trade.create({
      ...payload,
      status: payload.status || 'FILLED',
      riskAmount: validation.risk.riskAmount,
    });

    return res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      data: trade,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create trade',
      error: error.message,
    });
  }
};

const getTrades = async (req, res) => {
  try {
    const trades = await Trade.find().sort({ timestamp: -1 });
    return res.status(200).json({
      success: true,
      count: trades.length,
      data: trades,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trades',
      error: error.message,
    });
  }
};

const closeTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice } = req.body;

    if (exitPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'exitPrice is required to close a trade',
      });
    }

    const trade = await Trade.findById(id);
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found',
      });
    }

    const calculatedProfit =
      trade.side === 'buy'
        ? (exitPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - exitPrice) * trade.quantity;

    trade.exitPrice = exitPrice;
    trade.profit = calculatedProfit;

    await trade.save();

    return res.status(200).json({
      success: true,
      message: 'Trade closed successfully',
      data: trade,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to close trade',
      error: error.message,
    });
  }
};

module.exports = {
  createTrade,
  getTrades,
  closeTrade,
};
