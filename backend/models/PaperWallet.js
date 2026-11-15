const mongoose = require('mongoose');

const paperWalletSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    default: 'local-default',
  },
  mode: {
    type: String,
    enum: ['paper'],
    default: 'paper',
    immutable: true,
  },
  currency: {
    type: String,
    enum: ['INR'],
    default: 'INR',
    immutable: true,
  },
  initialCapital: {
    type: Number,
    required: true,
    min: 0,
    immutable: true,
  },
  availableBalance: {
    type: Number,
    required: true,
    min: 0,
  },
  realizedPnL: {
    type: Number,
    default: 0,
  },
  totalFees: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

module.exports = mongoose.models.PaperWallet
  || mongoose.model('PaperWallet', paperWalletSchema);
