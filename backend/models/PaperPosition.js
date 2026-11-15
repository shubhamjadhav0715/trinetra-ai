const mongoose = require('mongoose');

const paperPositionSchema = new mongoose.Schema({
  accountId: { type: String, required: true, default: 'local-default', index: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
  productId: { type: Number, required: true },
  side: { type: String, enum: ['LONG', 'SHORT'], required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
  contracts: { type: Number, required: true, min: 1 },
  contractValue: { type: Number, required: true, min: 0 },
  contractUnitCurrency: { type: String, required: true },
  entryPrice: { type: Number, required: true, min: 0 },
  markPrice: { type: Number, required: true, min: 0 },
  exitPrice: { type: Number, default: null },
  leverage: { type: Number, required: true, min: 1 },
  notionalUsd: { type: Number, required: true, min: 0 },
  marginUsdt: { type: Number, required: true, min: 0 },
  entryFeeUsdt: { type: Number, required: true, min: 0 },
  exitFeeUsdt: { type: Number, default: 0, min: 0 },
  unrealizedPnlUsdt: { type: Number, default: 0 },
  realizedPnlUsdt: { type: Number, default: 0 },
  stopLoss: { type: Number, default: null },
  takeProfit: { type: Number, default: null },
  exitReason: { type: String, default: '' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

paperPositionSchema.index({ accountId: 1, status: 1, openedAt: -1 });

module.exports = mongoose.models.PaperPosition
  || mongoose.model('PaperPosition', paperPositionSchema);
