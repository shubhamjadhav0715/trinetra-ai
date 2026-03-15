const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const healthRoute = require('./routes/health');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoute);

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
