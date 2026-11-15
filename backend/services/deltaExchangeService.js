const axios = require('axios');

const BASE_URL = process.env.DELTA_BASE_URL || 'https://api.india.delta.exchange';
const TIMEOUT_MS = 12_000;
const VALID_RESOLUTIONS = new Set(['1m', '3m', '5m', '15m', '30m', '1h']);
const DEFAULT_CONTRACT_TYPES = 'perpetual_futures';
const http = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT_MS, headers: { Accept: 'application/json' } });

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const unwrapResult = (payload, label) => {
  if (!payload || payload.success === false) {
    throw new Error(payload?.error?.message || `Delta Exchange returned an invalid ${label} response.`);
  }
  return payload.result ?? payload;
};

const normalizeCandle = (candle) => {
  const timestamp = toNumber(candle?.time ?? candle?.timestamp);
  const open = toNumber(candle?.open);
  const high = toNumber(candle?.high);
  const low = toNumber(candle?.low);
  const close = toNumber(candle?.close);
  const volume = toNumber(candle?.volume ?? 0);
  if (timestamp === null || timestamp <= 0 ||
      [open, high, low, close, volume].some((value) => value === null) ||
      [open, high, low, close].some((value) => value <= 0) ||
      volume < 0 || high < Math.max(open, close, low) ||
      low > Math.min(open, close, high)) return null;
  return { timestamp, open, high, low, close, volume };
};

const normalizeCandles = (payload) => {
  const rows = unwrapResult(payload, 'candles');
  if (!Array.isArray(rows)) throw new Error('Delta Exchange candles payload is not an array.');
  return rows.map(normalizeCandle).filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((candle, index, list) => index === 0 || candle.timestamp !== list[index - 1].timestamp);
};

const getProducts = async ({ contractTypes = DEFAULT_CONTRACT_TYPES, states = 'live' } = {}) => {
  const params = { states, contract_types: contractTypes };
  const response = await http.get('/v2/products', { params });
  const products = unwrapResult(response.data, 'products');
  if (!Array.isArray(products)) throw new Error('Delta Exchange products payload is not an array.');
  return products.map((product) => ({
    id: product.id,
    symbol: String(product.symbol || ''),
    description: product.description || '',
    contractType: product.contract_type || '',
    productType: product.product_type || '',
    underlyingAsset: product.underlying_asset?.symbol || product.underlying_asset || '',
    quotingAsset: product.quoting_asset?.symbol || product.quoting_asset || '',
    settlementAsset: product.settlement_asset?.symbol || product.settlement_asset || '',
    state: product.state || '',
    tickSize: toNumber(product.tick_size),
    contractValue: toNumber(product.contract_value),
    minOrderSize: toNumber(product.min_size),
    minSize: toNumber(product.min_size),
    maxLeverage: toNumber(product.max_leverage),
    makerCommissionRate: toNumber(product.maker_commission_rate),
    takerCommissionRate: toNumber(product.taker_commission_rate),
    initialMargin: toNumber(product.initial_margin),
    maintenanceMargin: toNumber(product.maintenance_margin),
  })).filter((product) => product.symbol);
};

const resolveProduct = async (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(normalized)) throw new Error('Invalid Delta Exchange product symbol.');
  const products = await getProducts();
  const product = products.find((item) => item.symbol === normalized);
  if (!product) throw new Error(`Live Delta Exchange product not found: ${normalized}`);
  return product;
};

const getTickers = async ({ contractTypes = DEFAULT_CONTRACT_TYPES, underlyingAssetSymbols } = {}) => {
  const params = { contract_types: contractTypes };
  if (underlyingAssetSymbols) params.underlying_asset_symbols = underlyingAssetSymbols;
  const response = await http.get('/v2/tickers', { params });
  const rows = unwrapResult(response.data, 'tickers');
  if (!Array.isArray(rows)) throw new Error('Delta Exchange tickers payload is not an array.');
  return rows.map((ticker) => ({
    symbol: String(ticker.symbol || ''),
    price: toNumber(ticker.close ?? ticker.last_price),
    markPrice: toNumber(ticker.mark_price),
    spotPrice: toNumber(ticker.spot_price),
    high24h: toNumber(ticker.high),
    low24h: toNumber(ticker.low),
    volume24h: toNumber(ticker.volume),
    openInterest: toNumber(ticker.oi ?? ticker.open_interest),
    timestamp: ticker.timestamp || null,
  })).filter((ticker) => ticker.symbol);
};

const getTicker = async (symbol) => {
  const product = await resolveProduct(symbol);
  const response = await http.get(`/v2/tickers/${encodeURIComponent(product.symbol)}`);
  const payload = unwrapResult(response.data, 'ticker');
  const item = Array.isArray(payload) ? payload[0] : payload;
  if (!item) throw new Error(`Ticker unavailable for ${product.symbol}`);
  return {
    symbol: product.symbol,
    price: toNumber(item.close ?? item.last_price),
    markPrice: toNumber(item.mark_price),
    spotPrice: toNumber(item.spot_price),
    high24h: toNumber(item.high),
    low24h: toNumber(item.low),
    volume24h: toNumber(item.volume),
    openInterest: toNumber(item.oi ?? item.open_interest),
  };
};

const getCandles = async ({ symbol, resolution = '5m', start, end }) => {
  if (!VALID_RESOLUTIONS.has(resolution)) throw new Error('Unsupported resolution. Use 1m, 3m, 5m, 15m, 30m, or 1h.');
  const product = await resolveProduct(symbol);
  const endSeconds = end === undefined ? Math.floor(Date.now() / 1000) : Number(end);
  const secondsPerCandle = ({ '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600 })[resolution];
  const startSeconds = start === undefined ? endSeconds - secondsPerCandle * 500 : Number(start);
  if (!Number.isSafeInteger(startSeconds) || !Number.isSafeInteger(endSeconds) ||
      startSeconds <= 0 || startSeconds >= endSeconds) {
    throw new Error('start and end must be valid Unix timestamps in seconds, with start before end.');
  }
  if (endSeconds - startSeconds > 2000 * secondsPerCandle) {
    throw new Error('Requested range exceeds 2000 candles. Split it into smaller requests.');
  }
  const response = await http.get('/v2/history/candles', {
    params: { resolution, symbol: product.symbol, start: startSeconds, end: endSeconds },
  });
  const candles = normalizeCandles(response.data);
  return {
    provider: 'Delta Exchange India',
    product: { symbol: product.symbol, contractType: product.contractType, productType: product.productType },
    resolution, count: candles.length, candles, lastUpdated: new Date().toISOString(),
  };
};

const normalizeMetricCandles = (payload) => {
  const rows = unwrapResult(payload, 'metric candles');
  if (!Array.isArray(rows)) throw new Error('Delta Exchange metric candles payload is not an array.');
  return rows.map((row) => {
    const timestamp = toNumber(row?.time ?? row?.timestamp);
    const open = toNumber(row?.open);
    const high = toNumber(row?.high);
    const low = toNumber(row?.low);
    const close = toNumber(row?.close);
    const volume = toNumber(row?.volume ?? 0);
    if (timestamp === null || timestamp <= 0 ||
        [open, high, low, close, volume].some((value) => value === null) ||
        volume < 0 || high < Math.max(open, close, low) ||
        low > Math.min(open, close, high)) return null;
    return { timestamp, open, high, low, close, volume };
  }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp)
    .filter((candle, index, list) => index === 0 || candle.timestamp !== list[index - 1].timestamp);
};

const getMetricHistory = async ({ symbol, metric, resolution = '5m', start, end }) => {
  if (!['FUNDING', 'OI', 'MARK'].includes(metric)) throw new Error('Unsupported futures metric.');
  if (!VALID_RESOLUTIONS.has(resolution)) throw new Error('Unsupported resolution for futures metric.');
  const product = await resolveProduct(symbol);
  const endSeconds = end === undefined ? Math.floor(Date.now() / 1000) : Number(end);
  const startSeconds = start === undefined ? endSeconds - secondsPerCandle * 500 : Number(start);
  if (!Number.isSafeInteger(startSeconds) || !Number.isSafeInteger(endSeconds) ||
      startSeconds <= 0 || startSeconds >= endSeconds ||
      endSeconds - startSeconds > 2000 * secondsPerCandle) {
    throw new Error('Invalid metric time range. Use Unix seconds and request no more than 2000 candles.');
  }
  const response = await http.get('/v2/history/candles', {
    params: { resolution, symbol: `${metric}:${product.symbol}`, start: startSeconds, end: endSeconds },
  });
  const candles = normalizeMetricCandles(response.data);
  return {
    provider: 'Delta Exchange India',
    symbol: product.symbol,
    metric: metric.toLowerCase(),
    resolution,
    count: candles.length,
    candles,
    lastUpdated: new Date().toISOString(),
  };
};

const getFundingHistory = (params) => getMetricHistory({ ...params, metric: 'FUNDING' });
const getOpenInterestHistory = (params) => getMetricHistory({ ...params, metric: 'OI' });
const getMarkPriceHistory = (params) => getMetricHistory({ ...params, metric: 'MARK' });

const getOrderBook = async (symbol, depth = 20) => {
  const product = await resolveProduct(symbol);
  const parsedDepth = Number(depth);
  if (!Number.isInteger(parsedDepth) || parsedDepth < 1 || parsedDepth > 100) {
    throw new Error('depth must be an integer between 1 and 100.');
  }
  const response = await http.get(`/v2/l2orderbook/${encodeURIComponent(product.symbol)}`, { params: { depth: parsedDepth } });
  return { symbol: product.symbol, ...unwrapResult(response.data, 'order book') };
};

module.exports = { VALID_RESOLUTIONS, normalizeCandle, normalizeCandles, normalizeMetricCandles, getProducts, getTickers, getTicker, getCandles, getFundingHistory, getOpenInterestHistory, getMarkPriceHistory, getOrderBook };
