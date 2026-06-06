require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./services/logger');
const workflowRoutes = require('./routes/workflows');
const webhookRoutes = require('./routes/webhooks');
const executionRoutes = require('./routes/executions');
const { initScheduler } = require('./services/scheduler');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing - raw for webhooks, json for rest
app.use('/webhooks', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/workflows', workflowRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/executions', executionRoutes);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Workflow Automation Engine backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  initScheduler();
});

module.exports = app;
