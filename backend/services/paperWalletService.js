const PaperWallet = require('../models/PaperWallet');
const futuresConfig = require('../config/futures');

const DEFAULT_ACCOUNT_ID = 'local-default';

const getOrCreatePaperWallet = async () => {
  const initialCapital = Number(futuresConfig.initialCapital);

  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new Error('Paper wallet initial capital must be greater than zero.');
  }

  try {
    return await PaperWallet.findOneAndUpdate(
      { accountId: DEFAULT_ACCOUNT_ID },
      {
        $setOnInsert: {
          accountId: DEFAULT_ACCOUNT_ID,
          mode: 'paper',
          currency: 'INR',
          initialCapital,
          availableBalance: initialCapital,
          realizedPnL: 0,
          totalFees: 0,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    // A simultaneous first request can race on the unique accountId index.
    if (error.code === 11000) {
      const existingWallet = await PaperWallet.findOne({ accountId: DEFAULT_ACCOUNT_ID });
      if (existingWallet) return existingWallet;
    }
    throw error;
  }
};

module.exports = { getOrCreatePaperWallet };
