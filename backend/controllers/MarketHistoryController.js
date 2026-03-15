const fyersService = require('../services/fyersService');

const getMarketHistory = async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol || '');
    const { resolution = '15', from, to } = req.query;

    const candles = await fyersService.getHistoricalCandles(symbol, resolution, from, to);

    return res.status(200).json({
      symbol,
      resolution,
      candles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch historical data',
      error: error.message,
    });
  }
};

module.exports = {
  getMarketHistory,
};

