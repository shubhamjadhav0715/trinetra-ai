const express = require('express');
const { getOrCreatePaperWallet } = require('../services/paperWalletService');

const router = express.Router();

// Phase 1: read or initialize the single local paper wallet.
// This route never sends orders to an exchange.
router.get('/wallet', async (req, res) => {
  try {
    const wallet = await getOrCreatePaperWallet();
    return res.status(200).json({
      success: true,
      mode: wallet.mode,
      wallet: {
        currency: wallet.currency,
        initialCapital: wallet.initialCapital,
        availableBalance: wallet.availableBalance,
        realizedPnL: wallet.realizedPnL,
        unrealizedPnL: 0,
        totalEquity: wallet.availableBalance,
        totalFees: wallet.totalFees,
      },
      note: 'Paper wallet only. No live exchange orders are enabled.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load paper wallet.',
      error: error.message,
    });
  }
});

module.exports = router;
