const express = require('express');
const { body } = require('express-validator');
const { executeSignal } = require('../execution/executionEngine');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
  '/signal',
  [
    body('symbol').isString().notEmpty(),
    body('signal').isIn(['BUY', 'SELL', 'HOLD']),
    body('entryPrice').optional().isNumeric(),
    body('exitPrice').optional().isNumeric(),
    body('stopLoss').optional().isNumeric(),
    body('target').optional().isNumeric(),
    body('positionSize').optional().isInt({ min: 0 }),
    body('quantity').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req, res) => {
    const result = await executeSignal(req.body);
    const statusCode = result.success ? 200 : result.blocked ? 400 : 500;
    return res.status(statusCode).json(result);
  },
);

module.exports = router;
