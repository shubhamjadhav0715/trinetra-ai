const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const healthRoute = require('./routes/health');
const tradeRoutes = require('./routes/tradeRoutes');
const marketRoutes = require('./routes/marketRoutes');
const marketHistoryRoutes = require('./routes/marketHistoryRoutes');
const executionRoutes = require('./routes/executionRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const cryptoRoutes = require('./routes/cryptoRoutes');
const paperTradingRoutes = require('./routes/paperTradingRoutes');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(helmet());
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
}));
app.use(express.json());

app.use('/api/health', healthRoute);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/market/history', marketHistoryRoutes);
app.use('/api/execution', executionRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/paper-trading', paperTradingRoutes);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
