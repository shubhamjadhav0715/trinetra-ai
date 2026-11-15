const axios = require('axios');

const BASE_URL = 'https://api.coindcx.com';
const TIMEOUT_MS = 12_000;
const VALID_INTERVALS = new Set(['1m', '15m', '1h', '1d']);

const http = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT_MS });

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeCandle = (candle) => {
  const timestamp = toNumber(candle?.time);
  const open = toNumber(candle?.open);
  const high = toNumber(candle?.high);
  const low = toNumber(candle?.low);
  const close = toNumber(candle?.close);
  const volume = toNumber(candle?.volume);

  if (
    timestamp === null ||
    timestamp <= 0 ||
    [open, high, low, close, volume].some((value) => value === null) ||
    [open, high, low, close].some((value) => value <= 0) ||
    volume < 0 ||
    high < Math.max(open, close, low) ||
    low > Math.min(open, close, high)
  ) {
    return null;
  }

  return { timestamp, open, high, low, close, volume };
};

const normalizeCandles = (payload) => {
  if (!Array.isArray(payload)) {
    throw new Error('CoinDCX returned an invalid candles response.');
  }

  return payload
    .map(normalizeCandle)
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((candle, index, list) => index === 0 || candle.timestamp !== list[index - 1].timestamp);
};

const normalizeTicker = (ticker) => ({
  symbol: String(ticker.market || ''),
  price: toNumber(ticker.last_price),
  change24h: toNumber(ticker.change_24_hour),
  high24h: toNumber(ticker.high),
  low24h: toNumber(ticker.low),
  volume24h: toNumber(ticker.volume),
  bid: toNumber(ticker.bid),
  ask: toNumber(ticker.ask),
  timestamp: toNumber(ticker.timestamp),
});

const getMarkets = async () => {
  const response = await http.get('/exchange/v1/markets_details');
  if (!Array.isArray(response.data)) {
    throw new Error('CoinDCX returned an invalid markets response.');
  }

  return response.data
    .filter((market) => market.status === 'active' && market.pair && market.coindcx_name)
    .map((market) => ({
      symbol: String(market.coindcx_name),
      pair: String(market.pair),
      baseAsset: String(market.target_currency_short_name || ''),
      quoteAsset: String(market.base_currency_short_name || ''),
      status: market.status,
    }));
};

const resolveMarket = async (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(normalized)) {
    throw new Error('Invalid market symbol. Use a symbol such as BTCUSDT.');
  }

  const markets = await getMarkets();
  const market = markets.find((item) => item.symbol === normalized);
  if (!market) {
    throw new Error(`Active CoinDCX market not found: ${normalized}`);
  }
  return market;
};

const getTickers = async () => {
  const response = await http.get('/exchange/ticker');
  if (!Array.isArray(response.data)) {
    throw new Error('CoinDCX returned an invalid ticker response.');
  }
  return response.data.map(normalizeTicker).filter((item) => item.symbol && item.price !== null);
};

const getTicker = async (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  const tickers = await getTickers();
  const ticker = tickers.find((item) => item.symbol === normalized);
  if (!ticker) throw new Error(`Ticker not found for ${normalized}`);
  return ticker;
};

const getCandles = async ({ symbol, interval = '1m', limit = 500, startTime, endTime }) => {
  if (!VALID_INTERVALS.has(interval)) {
    throw new Error('Unsupported interval. CoinDCX spot candles support 1m, 15m, 1h, and 1d.');
  }

  const parsedLimit = Number(limit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
    throw new Error('limit must be an integer between 1 and 1000.');
  }

  const market = await resolveMarket(symbol);
  const params = { pair: market.pair, interval, limit: parsedLimit };

  if (startTime !== undefined) {
    const value = Number(startTime);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('startTime must be epoch milliseconds.');
    params.startTime = value;
  }
  if (endTime !== undefined) {
    const value = Number(endTime);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('endTime must be epoch milliseconds.');
    params.endTime = value;
  }
  if (params.startTime && params.endTime && params.startTime >= params.endTime) {
    throw new Error('startTime must be earlier than endTime.');
  }

  const response = await http.get('/market_data/candles', { params });
  const candles = normalizeCandles(response.data);
  return {
    provider: 'CoinDCX',
    market,
    interval,
    count: candles.length,
    candles,
    lastUpdated: new Date().toISOString(),
  };
};

module.exports = {
  VALID_INTERVALS,
  normalizeCandle,
  normalizeCandles,
  normalizeTicker,
  getMarkets,
  getTickers,
  getTicker,
  getCandles,
};
