const axios = require('axios');

const FYERS_BASE_URL = process.env.FYERS_BASE_URL || 'https://api-t1.fyers.in/api/v3';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCredentials = () => {
  const { FYERS_APP_ID, FYERS_SECRET, FYERS_ACCESS_TOKEN } = process.env;

  if (!FYERS_APP_ID || !FYERS_SECRET || !FYERS_ACCESS_TOKEN) {
    throw new Error('Missing FYERS credentials in environment variables.');
  }

  return { FYERS_APP_ID, FYERS_SECRET, FYERS_ACCESS_TOKEN };
};

const getHeaders = () => {
  const { FYERS_APP_ID, FYERS_SECRET, FYERS_ACCESS_TOKEN } = getCredentials();

  return {
    Authorization: `Bearer ${FYERS_ACCESS_TOKEN}`,
    'X-FYERS-APP-ID': FYERS_APP_ID,
    'X-FYERS-SECRET': FYERS_SECRET,
    'Content-Type': 'application/json',
  };
};

const isRetryableError = (error) => {
  const status = error?.response?.status;
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;

  // Axios network errors / timeouts often come with no response.
  const code = error?.code;
  return ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'].includes(code);
};

const requestWithRetry = async (fn, { retries = 3, baseDelayMs = 350 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableError(error)) break;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
  throw lastError;
};

const normalizeQuote = (symbol, raw) => {
  // FYERS quote payloads have nested shapes; keep raw but extract best-effort lp.
  const quote = raw?.d?.[0]?.v || raw?.data?.d?.[0]?.v || raw?.v || {};
  const lastPrice = quote.lp ?? quote.last_price ?? quote.close ?? null;
  const ts = quote.tt ?? quote.timestamp ?? quote.t ?? null;

  return {
    symbol,
    price: lastPrice === null ? null : Number(lastPrice),
    timestamp: ts === null ? null : Number(ts),
    raw,
  };
};

const getMarketData = async (symbol) => {
  const response = await requestWithRetry(
    () =>
      axios.get(`${FYERS_BASE_URL}/data/quotes`, {
        params: { symbols: symbol },
        headers: getHeaders(),
        timeout: 10_000,
      }),
    { retries: 3 },
  );

  return response.data || {};
};

const getQuote = async (symbol) => {
  if (!symbol) throw new Error('symbol is required');
  const raw = await getMarketData(symbol);
  return normalizeQuote(symbol, raw);
};

const placeOrder = async (orderData) => {
  const response = await requestWithRetry(
    () =>
      axios.post(`${FYERS_BASE_URL}/orders`, orderData, {
        headers: getHeaders(),
        timeout: 10_000,
      }),
    { retries: 2 },
  );

  return response.data || {};
};

const getPositions = async () => {
  const response = await requestWithRetry(
    () =>
      axios.get(`${FYERS_BASE_URL}/positions`, {
        headers: getHeaders(),
        timeout: 10_000,
      }),
    { retries: 2 },
  );

  return response.data || {};
};

const getAccountBalance = async () => {
  const response = await requestWithRetry(
    () =>
      axios.get(`${FYERS_BASE_URL}/funds`, {
        headers: getHeaders(),
        timeout: 10_000,
      }),
    { retries: 2 },
  );

  return response.data || {};
};

const toEpochSeconds = (value) => {
  if (value === undefined || value === null || value === '') return null;

  // Accept epoch seconds/millis as number-ish input.
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && String(value).trim() !== '') {
    return asNumber > 10_000_000_000 ? Math.floor(asNumber / 1000) : Math.floor(asNumber);
  }

  // Fallback: date string (YYYY-MM-DD / ISO / etc.).
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 1000);
};

const getHistoricalCandles = async (symbol, resolution = '5', from, to) => {
  const defaultFrom = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000);
  const defaultTo = Math.floor(Date.now() / 1000);

  const rangeFrom = toEpochSeconds(from) ?? defaultFrom;
  const rangeTo = toEpochSeconds(to) ?? defaultTo;

  if (!symbol) {
    throw new Error('symbol is required');
  }

  if (!resolution) {
    throw new Error('resolution is required');
  }

  if (!Number.isFinite(rangeFrom) || !Number.isFinite(rangeTo) || rangeFrom >= rangeTo) {
    throw new Error('Invalid from/to range for historical candles');
  }

  const response = await requestWithRetry(
    () =>
      axios.get(`${FYERS_BASE_URL}/data/history`, {
        headers: getHeaders(),
        params: {
          symbol,
          resolution,
          // Use epoch seconds. FYERS expects range_from/range_to in epoch when date_format=0.
          date_format: '0',
          range_from: rangeFrom,
          range_to: rangeTo,
          cont_flag: '1',
        },
        timeout: 15_000,
      }),
    { retries: 3, baseDelayMs: 450 },
  );

  const candles = Array.isArray(response.data?.candles) ? response.data.candles : [];

  return candles.map((candle) => ({
    timestamp: candle[0],
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
    volume: Number(candle[5]),
  }));
};

module.exports = {
  getQuote,
  getMarketData,
  placeOrder,
  getPositions,
  getAccountBalance,
  getHistoricalCandles,
};
