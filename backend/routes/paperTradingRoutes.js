const express = require('express');
const { getOrCreatePaperWallet } = require('../services/paperWalletService');
const {
  openPaperPosition,
  listPaperPositions,
  closePaperPosition,
  monitorOpenPositions,
} = require('../services/paperPositionService');

const router = express.Router();

const serializePosition = (position) => ({
  id: position._id,
  symbol: position.symbol,
  side: position.side,
  status: position.status,
  contracts: position.contracts,
  contractValue: position.contractValue,
  contractUnitCurrency: position.contractUnitCurrency,
  entryPrice: position.entryPrice,
  markPrice: position.markPrice,
  exitPrice: position.exitPrice,
  leverage: position.leverage,
  notionalUsd: position.notionalUsd,
  marginUsdt: position.marginUsdt,
  entryFeeUsdt: position.entryFeeUsdt,
  exitFeeUsdt: position.exitFeeUsdt,
  unrealizedPnlUsdt: position.unrealizedPnlUsdt,
  realizedPnlUsdt: position.realizedPnlUsdt,
  stopLoss: position.stopLoss,
  takeProfit: position.takeProfit,
  exitReason: position.exitReason,
  openedAt: position.openedAt,
  closedAt: position.closedAt,
});

// Read-only paper wallet summary. Open-position margin and P&L are included in equity.
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await getOrCreatePaperWallet();
    const positions = await listPaperPositions({ status: 'OPEN', refresh: true });
    const lockedMargin = positions.reduce((sum, position) => sum + position.marginUsdt, 0);
    const unrealizedPnL = positions.reduce((sum, position) => sum + position.unrealizedPnlUsdt, 0);
    return res.status(200).json({
      success: true,
      mode: wallet.mode,
      wallet: {
        currency: wallet.currency,
        initialCapital: wallet.initialCapital,
        availableBalance: wallet.availableBalance,
        lockedMargin: Number(lockedMargin.toFixed(8)),
        realizedPnL: wallet.realizedPnL,
        unrealizedPnL: Number(unrealizedPnL.toFixed(8)),
        totalEquity: Number((wallet.availableBalance + lockedMargin + unrealizedPnL).toFixed(8)),
        totalFees: wallet.totalFees,
      },
      note: 'USDT paper simulation only. USD/USDT is approximated at 1:1. No live exchange orders are enabled.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load paper wallet.',
      error: error.message,
    });
  }
});

// Open a simulated position using the latest Delta mark price; no exchange order is sent.
router.post('/positions', async (req, res) => {
  try {
    const position = await openPaperPosition(req.body || {});
    return res.status(201).json({
      success: true,
      mode: 'paper',
      position: serializePosition(position),
      note: 'Paper position created locally. No live exchange order was placed.',
    });
  } catch (error) {
    const clientError = /must be|Only configured|Maximum|risk|stopLoss|For LONG|For SHORT|Insufficient|not found|incomplete|requires|Invalid|paper-only|whole number/i.test(error.message);
    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: 'Unable to open paper position.',
      error: error.message,
    });
  }
});

// List positions. OPEN positions refresh their mark price by default.
router.get('/positions', async (req, res) => {
  try {
    const status = String(req.query.status || 'OPEN').toUpperCase();
    if (!['OPEN', 'CLOSED', 'ALL'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be OPEN, CLOSED, or ALL.' });
    }
    const positions = await listPaperPositions({
      status,
      refresh: req.query.refresh !== 'false',
    });
    return res.status(200).json({
      success: true,
      mode: 'paper',
      count: positions.length,
      positions: positions.map(serializePosition),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load paper positions.',
      error: error.message,
    });
  }
});


 // Check every open paper position against its latest Delta mark price.
router.post('/positions/monitor', async (req, res) => {
  try {
    const results = await monitorOpenPositions();
    return res.status(200).json({
      success: true,
      mode: 'paper',
      checked: results.length,
      results,
      note: 'This check runs when called. Keep calling this endpoint from a trusted scheduler or dashboard for repeated monitoring. No live exchange orders are sent.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to monitor paper positions.',
      error: error.message,
    });
  }
});

// Close a simulated position at the latest available Delta mark price.
router.post('/positions/:id/close', async (req, res) => {
  try {
    const result = await closePaperPosition(req.params.id, req.body?.reason || 'MANUAL');
    return res.status(200).json({
      success: true,
      mode: 'paper',
      position: serializePosition(result.position),
      pnl: result.pnl,
      note: 'Paper position closed locally. No live exchange order was placed.',
    });
  } catch (error) {
    const clientError = /Invalid|not found|already closed/i.test(error.message);
    return res.status(clientError ? 400 : 500).json({
      success: false,
      message: 'Unable to close paper position.',
      error: error.message,
    });
  }
});

module.exports = router;
