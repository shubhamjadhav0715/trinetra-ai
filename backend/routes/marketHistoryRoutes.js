const express = require('express');
const { param, query } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { getMarketHistory } = require('../controllers/MarketHistoryController');

const router = express.Router();

// Mounted at /api/market/history
router.get(
  '/:symbol',
  [
    param('symbol').isString().notEmpty(),
    query('resolution').optional().isString(),
    query('from').optional(),
    query('to').optional(),
  ],
  validateRequest,
  getMarketHistory,
);

module.exports = router;

