const PaperWallet = require('../models/PaperWallet');
const futuresConfig = require('../config/futures');

const DEFAULT_ACCOUNT_ID = 'local-default';

const getOrCreatePaperWallet = async () => {
  const initialCapital = Number(futuresConfig.initialCapital);
  const currency = futuresConfig.currency;

  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new Error('Paper wallet initial capital must be greater than zero.');
  }

  if (currency !== 'USDT') {
    throw new Error('Paper wallet currency must be USDT.');
  }

  try {
    let wallet = await PaperWallet.findOne({ accountId: DEFAULT_ACCOUNT_ID });

    if (wallet) {
      if (wallet.currency !== currency) {
        // Only migrate the previously initialized INR wallet when it has
        // never been used. Never overwrite funds or P&L after trading begins.
        const walletHasNoActivity = wallet.currency === 'INR'
          && wallet.realizedPnL === 0
          && wallet.totalFees === 0
          && wallet.availableBalance === wallet.initialCapital;

        if (!walletHasNoActivity) {
          throw new Error(
            'Existing paper wallet has trading activity or an unsupported currency. '
            + 'Automatic currency migration was blocked to protect its balance.',
          );
        }

        wallet.currency = currency;
        wallet.initialCapital = initialCapital;
        wallet.availableBalance = initialCapital;
        wallet.realizedPnL = 0;
        wallet.totalFees = 0;
        await wallet.save();
      }

      return wallet;
    }

    wallet = await PaperWallet.create({
      accountId: DEFAULT_ACCOUNT_ID,
      mode: 'paper',
      currency,
      initialCapital,
      availableBalance: initialCapital,
      realizedPnL: 0,
      totalFees: 0,
    });

    return wallet;
  } catch (error) {
    // A simultaneous first request can race on the unique accountId index.
    if (error.code === 11000) {
      const existingWallet = await PaperWallet.findOne({ accountId: DEFAULT_ACCOUNT_ID });
      if (existingWallet && existingWallet.currency === currency) return existingWallet;
    }
    throw error;
  }
};

module.exports = { getOrCreatePaperWallet };
