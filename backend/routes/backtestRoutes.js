const express = require('express');
const { body } = require('express-validator');
const { runBacktest } = require('../backtest/backtestEngine');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
  '/run',
  [
    body('symbol').isString().notEmpty().withMessage('symbol is required'),
    body('resolution').optional().isString(),
    body('from').optional().isString(),
    body('to').optional().isString(),
    body('initialCapital').optional().isNumeric(),
    body('riskPercent').optional().isNumeric(),
    body('strategy').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await runBacktest(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Backtest failed',
        error: error.message,
      });
    }
  },
);

module.exports = router;
