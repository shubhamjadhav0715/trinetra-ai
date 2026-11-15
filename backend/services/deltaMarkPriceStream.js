const WebSocket = require('ws');

const WS_URL = process.env.DELTA_PUBLIC_WS_URL || 'wss://public-socket.india.delta.exchange';
const SYMBOLS = ['BTCUSD', 'ETHUSD'];
const MAX_PRICE_AGE_MS = 7_000;
const prices = new Map();

let socket = null;
let reconnectTimer = null;
let reconnectDelayMs = 1_000;
let stopped = false;

const getFreshMarkPrice = (symbol) => {
  const item = prices.get(String(symbol).toUpperCase());
  if (!item || Date.now() - item.receivedAt > MAX_PRICE_AGE_MS) return null;
  return item.price;
};

const connect = () => {
  if (stopped || socket) return;
  socket = new WebSocket(WS_URL);

  socket.on('open', () => {
    reconnectDelayMs = 1_000;
    console.log('[Delta WS] Connected to public market feed.');
    socket.send(JSON.stringify({
      type: 'subscribe',
      payload: {
        channels: [{
          name: 'mark_price',
          symbols: SYMBOLS.map((symbol) => `MARK:${symbol}`),
        }],
      },
    }));
  });

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type !== 'mark_price') return;
      const rawSymbol = String(message.sy || message.symbol || '').toUpperCase();
      const symbol = rawSymbol.replace(/^MARK:/, '');
      const price = Number(message.p ?? message.price);
      if (!SYMBOLS.includes(symbol) || !Number.isFinite(price) || price <= 0) return;
      prices.set(symbol, {
        price,
        receivedAt: Date.now(),
        exchangeTimestamp: message.ts || null,
      });
    } catch (error) {
      console.error('[Delta WS] Ignored invalid market message:', error.message);
    }
  });

  socket.on('error', (error) => {
    console.error('[Delta WS] Connection error:', error.message);
  });

  socket.on('close', () => {
    socket = null;
    if (stopped || reconnectTimer) return;
    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
    console.warn(`[Delta WS] Disconnected. Reconnecting in ${delay}ms.`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  });
};

const startDeltaMarkPriceStream = () => {
  if (socket || reconnectTimer) return;
  stopped = false;
  connect();
};

const stopDeltaMarkPriceStream = () => {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket) socket.close();
  socket = null;
};

const getStreamStatus = () => ({
  connected: Boolean(socket && socket.readyState === WebSocket.OPEN),
  prices: Object.fromEntries(SYMBOLS.map((symbol) => {
    const item = prices.get(symbol);
    return [symbol, item ? {
      price: item.price,
      ageMs: Date.now() - item.receivedAt,
      fresh: Date.now() - item.receivedAt <= MAX_PRICE_AGE_MS,
    } : null];
  })),
});

module.exports = {
  startDeltaMarkPriceStream,
  stopDeltaMarkPriceStream,
  getFreshMarkPrice,
  getStreamStatus,
};
