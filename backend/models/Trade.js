const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  exitPrice: {
    type: Number,
    default: null,
  },
  quantity: {
    type: Number,
    required: true,
  },
  side: {
    type: String,
    required: true,
    enum: ['buy', 'sell'],
  },
  profit: {
    type: Number,
    default: 0,
  },
  stopLoss: {
    type: Number,
    default: null,
  },
  target: {
    type: Number,
    default: null,
  },
  strategy: {
    type: String,
    default: '',
  },
  tradeDuration: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PLACED', 'FILLED', 'CANCELLED', 'FAILED'],
    default: 'PENDING',
  },
  mode: {
    type: String,
    enum: ['paper', 'live'],
    default: 'paper',
  },
  orderId: {
    type: String,
    default: '',
  },
  riskAmount: {
    type: Number,
    default: 0,
  },
  orderEvents: {
    type: [
      {
        status: { type: String, required: true },
        message: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    default: [],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Trade', tradeSchema);
