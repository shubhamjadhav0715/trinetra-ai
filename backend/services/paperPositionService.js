const mongoose = require('mongoose');
const PaperPosition = require('../models/PaperPosition');
const PaperWallet = require('../models/PaperWallet');
const futuresConfig = require('../config/futures');
const { resolveProduct, getTicker } = require('./deltaExchangeService');

const ACCOUNT_ID = 'local-default';
const USD_TO_USDT = Number(futuresConfig.usdToUsdtRate);

const round = (value) => Number(value.toFixed(8));
const assertPositive = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be a positive number.`);
  return number;
};

const calculatePnlUsd = ({ side, contracts, contractValue, entryPrice, markPrice }) => {
  const direction = side === 'LONG' ? 1 : -1;
  return direction * contracts * contractValue * (markPrice - entryPrice);
};

const getOpenPositions = async () => PaperPosition.find({ accountId: ACCOUNT_ID, status: 'OPEN' }).sort({ openedAt: -1 });

const getDailyRealizedNetPnl = async () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const closedToday = await PaperPosition.find({
    accountId: ACCOUNT_ID,
    status: 'CLOSED',
    closedAt: { $gte: start, $lte: now },
  }).select('realizedPnlUsdt entryFeeUsdt exitFeeUsdt');
  return closedToday.reduce((sum, position) => (
    sum + position.realizedPnlUsdt - position.entryFeeUsdt - position.exitFeeUsdt
  ), 0);
};

const openPaperPosition = async (input) => {
  if (futuresConfig.tradingMode !== 'paper' || futuresConfig.allowLiveOrders) {
    throw new Error('Paper position engine is not in a safe paper-only configuration.');
  }
  if (USD_TO_USDT !== 1) throw new Error('This simulation currently requires USD/USDT peg rate to equal 1.');
  const symbol = String(input.symbol || '').trim().toUpperCase();
  if (!futuresConfig.defaultSymbols.includes(symbol)) throw new Error('Only configured symbols BTCUSD and ETHUSD are enabled.');
  const side = String(input.side || '').trim().toUpperCase();
  if (!['LONG', 'SHORT'].includes(side)) throw new Error('side must be LONG or SHORT.');
  const contracts = assertPositive(input.contracts, 'contracts');
  if (!Number.isInteger(contracts)) throw new Error('contracts must be a whole number for this paper engine.');
  const leverage = assertPositive(input.leverage ?? futuresConfig.defaultLeverage, 'leverage');
  if (leverage > futuresConfig.maxPaperLeverage) throw new Error(`Maximum paper leverage is ${futuresConfig.maxPaperLeverage}x.`);

  const currentOpenPositions = await getOpenPositions();
  if (currentOpenPositions.length >= futuresConfig.maxOpenPositions) {
    throw new Error(`Maximum ${futuresConfig.maxOpenPositions} open paper positions reached.`);
  }
  const dailyNetPnl = await getDailyRealizedNetPnl();
  const dailyLossLimit = Number(futuresConfig.initialCapital) * Number(futuresConfig.maxDailyLossPercent) / 100;
  if (dailyNetPnl <= -dailyLossLimit) {
    throw new Error('Daily paper loss limit reached. New positions are disabled until the next day.');
  }

  const product = await resolveProduct(symbol);
  if (product.state !== 'live' || !product.contractValue || !product.tickSize || product.quotingAsset !== 'USD') {
    throw new Error('Delta product metadata is incomplete, not live, or not USD-quoted.');
  }
  const ticker = await getTicker(symbol);
  const entryPrice = assertPositive(ticker.markPrice ?? ticker.price, 'current mark price');
  const stopLoss = assertPositive(input.stopLoss, 'stopLoss');
  const takeProfit = input.takeProfit == null ? null : assertPositive(input.takeProfit, 'takeProfit');
  if (side === 'LONG' && ((stopLoss !== null && stopLoss >= entryPrice) || (takeProfit !== null && takeProfit <= entryPrice))) {
    throw new Error('For LONG, stopLoss must be below entry and takeProfit must be above entry.');
  }
  if (side === 'SHORT' && ((stopLoss !== null && stopLoss <= entryPrice) || (takeProfit !== null && takeProfit >= entryPrice))) {
    throw new Error('For SHORT, stopLoss must be above entry and takeProfit must be below entry.');
  }

  const riskDistance = Math.abs(entryPrice - stopLoss);
  const grossStopRiskUsdt = contracts * product.contractValue * riskDistance * USD_TO_USDT;
  const estimatedExitFeeAtStop = contracts * product.contractValue * stopLoss * feeRate * USD_TO_USDT;
  const estimatedRoundTripRisk = grossStopRiskUsdt + entryFeeUsdt + estimatedExitFeeAtStop;
  const maxRiskUsdt = Number(futuresConfig.initialCapital)
    * Number(futuresConfig.riskPerTradePercent) / 100;
  if (estimatedRoundTripRisk > maxRiskUsdt) {
    throw new Error(`Position risk ${round(estimatedRoundTripRisk)} USDT exceeds the ${round(maxRiskUsdt)} USDT per-trade risk limit. Reduce contracts or move the stop closer.`);
  }

  const notionalUsd = contracts * product.contractValue * entryPrice;
  const marginUsdt = notionalUsd / leverage * USD_TO_USDT;
  const feeRate = Number(product.takerCommissionRate);
  if (!Number.isFinite(feeRate) || feeRate < 0) throw new Error('Valid taker fee is unavailable from Delta product metadata.');
  const entryFeeUsdt = notionalUsd * feeRate * USD_TO_USDT;
  const requiredUsdt = marginUsdt + entryFeeUsdt;
  const wallet = await PaperWallet.findOne({ accountId: ACCOUNT_ID, currency: 'USDT' });
  if (!wallet) throw new Error('USDT paper wallet not found.');
  const debited = await PaperWallet.findOneAndUpdate(
    { _id: wallet._id, availableBalance: { $gte: requiredUsdt } },
    { $inc: { availableBalance: -requiredUsdt, totalFees: entryFeeUsdt } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!debited) throw new Error('Insufficient available USDT balance for margin and entry fee.');

  try {
    const position = await PaperPosition.create({
      accountId: ACCOUNT_ID, symbol, productId: product.id, side, contracts,
      contractValue: product.contractValue,
      contractUnitCurrency: product.underlyingAsset,
      entryPrice, markPrice: entryPrice, leverage,
      notionalUsd, marginUsdt, entryFeeUsdt,
      stopLoss, takeProfit,
    });
    return position;
  } catch (error) {
    await PaperWallet.updateOne({ _id: wallet._id }, {
      $inc: { availableBalance: requiredUsdt, totalFees: -entryFeeUsdt },
    });
    throw error;
  }
};

const refreshPositionMark = async (position) => {
  const ticker = await getTicker(position.symbol);
  const markPrice = assertPositive(ticker.markPrice ?? ticker.price, 'current mark price');
  const pnlUsd = calculatePnlUsd({
    side: position.side, contracts: position.contracts,
    contractValue: position.contractValue, entryPrice: position.entryPrice, markPrice,
  });
  position.markPrice = markPrice;
  position.unrealizedPnlUsdt = round(pnlUsd * USD_TO_USDT);
  await position.save();
  return position;
};

const listPaperPositions = async ({ status = 'OPEN', refresh = true } = {}) => {
  const filter = { accountId: ACCOUNT_ID };
  if (status !== 'ALL') filter.status = status;
  const positions = await PaperPosition.find(filter).sort({ openedAt: -1 });
  if (status !== 'CLOSED' && refresh) {
    return Promise.all(positions.map((position) => (
      position.status === 'OPEN' ? refreshPositionMark(position) : position
    )));
  }
  return positions;
};

const closePaperPosition = async (positionId, reason = 'MANUAL', exitPriceOverride = null) => {
  if (!mongoose.isValidObjectId(positionId)) throw new Error('Invalid paper position ID.');
  const position = await PaperPosition.findOne({ _id: positionId, accountId: ACCOUNT_ID, status: 'OPEN' });
  if (!position) throw new Error('Open paper position not found.');
  const ticker = exitPriceOverride === null ? await getTicker(position.symbol) : null;
  const exitPrice = assertPositive(exitPriceOverride ?? ticker.markPrice ?? ticker.price, 'current mark price');
  const grossPnlUsd = calculatePnlUsd({
    side: position.side, contracts: position.contracts,
    contractValue: position.contractValue, entryPrice: position.entryPrice, markPrice: exitPrice,
  });
  const exitNotionalUsd = position.contracts * position.contractValue * exitPrice;
  const product = await resolveProduct(position.symbol);
  const feeRate = Number(product.takerCommissionRate);
  if (!Number.isFinite(feeRate) || feeRate < 0) throw new Error('Valid taker fee is unavailable.');
  const exitFeeUsdt = exitNotionalUsd * feeRate * USD_TO_USDT;
  const grossPnlUsdt = grossPnlUsd * USD_TO_USDT;
  const netPnlUsdt = grossPnlUsdt - position.entryFeeUsdt - exitFeeUsdt;
  const claimed = await PaperPosition.findOneAndUpdate(
    { _id: position._id, accountId: ACCOUNT_ID, status: 'OPEN' },
    { $set: {
      status: 'CLOSED', markPrice: exitPrice, exitPrice,
      exitFeeUsdt: round(exitFeeUsdt), realizedPnlUsdt: round(grossPnlUsdt),
      unrealizedPnlUsdt: 0, exitReason: String(reason).slice(0, 60), closedAt: new Date(),
    } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!claimed) throw new Error('Position was already closed.');
  await PaperWallet.updateOne(
    { accountId: ACCOUNT_ID, currency: 'USDT' },
    { $inc: {
      availableBalance: position.marginUsdt + grossPnlUsdt - exitFeeUsdt,
      realizedPnL: grossPnlUsdt - position.entryFeeUsdt - exitFeeUsdt,
      totalFees: exitFeeUsdt,
    } },
  );
  return {
    position: claimed,
    pnl: {
      grossUsdt: round(grossPnlUsdt),
      entryFeeUsdt: round(position.entryFeeUsdt),
      exitFeeUsdt: round(exitFeeUsdt),
      netUsdt: round(netPnlUsdt),
    },
  };
};


const monitorOpenPositions = async () => {
  const positions = await getOpenPositions();
  const results = [];
  for (const position of positions) {
    const ticker = await getTicker(position.symbol);
    const markPrice = assertPositive(ticker.markPrice ?? ticker.price, 'current mark price');
    const hitStop = position.stopLoss !== null && (
      (position.side === 'LONG' && markPrice <= position.stopLoss)
      || (position.side === 'SHORT' && markPrice >= position.stopLoss)
    );
    const hitTarget = position.takeProfit !== null && (
      (position.side === 'LONG' && markPrice >= position.takeProfit)
      || (position.side === 'SHORT' && markPrice <= position.takeProfit)
    );
    if (hitStop || hitTarget) {
      const reason = hitStop ? 'STOP_LOSS' : 'TAKE_PROFIT';
      const closed = await closePaperPosition(String(position._id), reason, markPrice);
      results.push({ positionId: String(position._id), action: 'CLOSED', reason, result: closed });
    } else {
      const pnlUsd = calculatePnlUsd({
        side: position.side, contracts: position.contracts,
        contractValue: position.contractValue, entryPrice: position.entryPrice, markPrice,
      });
      position.markPrice = markPrice;
      position.unrealizedPnlUsdt = round(pnlUsd * USD_TO_USDT);
      await position.save();
      results.push({ positionId: String(position._id), action: 'HOLD', markPrice, unrealizedPnlUsdt: position.unrealizedPnlUsdt });
    }
  }
  return results;
};

module.exports = { openPaperPosition, listPaperPositions, closePaperPosition, calculatePnlUsd, monitorOpenPositions };
