const round2 = (value) => Number(Number(value).toFixed(2));

const createPortfolio = (initialCash = 100000) => ({
  cash: round2(initialCash),
  positions: {}, // { [symbol]: { quantity, avgPrice, lastPrice } }
  totalEquity: round2(initialCash),
});

const recalcTotalEquity = (portfolio) => {
  const positionsValue = Object.values(portfolio.positions || {}).reduce((sum, pos) => {
    const qty = Number(pos.quantity || 0);
    const px = Number(pos.lastPrice ?? pos.avgPrice ?? 0);
    return sum + qty * px;
  }, 0);

  portfolio.totalEquity = round2(Number(portfolio.cash || 0) + positionsValue);
  return portfolio;
};

const updatePortfolioOnBuy = (portfolio, { symbol, quantity, price }) => {
  if (!portfolio) throw new Error('portfolio is required');
  if (!symbol) throw new Error('symbol is required');

  const qty = Number(quantity);
  const px = Number(price);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Invalid buy quantity');
  if (!Number.isFinite(px) || px <= 0) throw new Error('Invalid buy price');

  const cost = qty * px;
  portfolio.cash = round2(Number(portfolio.cash || 0) - cost);

  const existing = portfolio.positions[symbol] || { quantity: 0, avgPrice: 0, lastPrice: px };
  const newQty = Number(existing.quantity || 0) + qty;
  const newAvg =
    newQty > 0
      ? (Number(existing.avgPrice || 0) * Number(existing.quantity || 0) + cost) / newQty
      : 0;

  portfolio.positions[symbol] = {
    quantity: newQty,
    avgPrice: round2(newAvg),
    lastPrice: round2(px),
  };

  return recalcTotalEquity(portfolio);
};

const updatePortfolioOnSell = (portfolio, { symbol, quantity, price }) => {
  if (!portfolio) throw new Error('portfolio is required');
  if (!symbol) throw new Error('symbol is required');

  const qty = Number(quantity);
  const px = Number(price);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Invalid sell quantity');
  if (!Number.isFinite(px) || px <= 0) throw new Error('Invalid sell price');

  const existing = portfolio.positions[symbol];
  const existingQty = Number(existing?.quantity || 0);
  if (!existing || existingQty < qty) throw new Error('Insufficient position quantity to sell');

  const proceeds = qty * px;
  portfolio.cash = round2(Number(portfolio.cash || 0) + proceeds);

  const remainingQty = existingQty - qty;
  if (remainingQty <= 0) {
    delete portfolio.positions[symbol];
  } else {
    portfolio.positions[symbol] = {
      ...existing,
      quantity: remainingQty,
      lastPrice: round2(px),
    };
  }

  return recalcTotalEquity(portfolio);
};

const calculateUnrealizedPnL = (portfolio, pricesBySymbol = {}) => {
  if (!portfolio) throw new Error('portfolio is required');

  let unrealizedPnL = 0;
  for (const [symbol, pos] of Object.entries(portfolio.positions || {})) {
    const qty = Number(pos.quantity || 0);
    const avg = Number(pos.avgPrice || 0);
    const last = Number(pricesBySymbol[symbol] ?? pos.lastPrice ?? avg);
    if (!Number.isFinite(qty) || !Number.isFinite(avg) || !Number.isFinite(last)) continue;
    unrealizedPnL += (last - avg) * qty;
    pos.lastPrice = round2(last);
  }

  recalcTotalEquity(portfolio);
  return {
    unrealizedPnL: round2(unrealizedPnL),
    cash: round2(Number(portfolio.cash || 0)),
    totalEquity: round2(Number(portfolio.totalEquity || 0)),
    positions: portfolio.positions,
  };
};

module.exports = {
  createPortfolio,
  updatePortfolioOnBuy,
  updatePortfolioOnSell,
  calculateUnrealizedPnL,
};

