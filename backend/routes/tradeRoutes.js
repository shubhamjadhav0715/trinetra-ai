const express = require('express');
const { body, param } = require('express-validator');
const {
  createTrade,
  getTrades,
  closeTrade,
} = require('../controllers/TradeController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
  '/',
  [
    body('symbol').isString().notEmpty(),
    body('entryPrice').isNumeric(),
    body('quantity').isNumeric(),
    body('side').isIn(['buy', 'sell']),
    body('stopLoss').optional().isNumeric(),
    body('target').optional().isNumeric(),
  ],
  validateRequest,
  createTrade,
);
router.get('/', getTrades);
router.put(
  '/:id/close',
  [param('id').isMongoId(), body('exitPrice').isNumeric()],
  validateRequest,
  closeTrade,
);

module.exports = router;
