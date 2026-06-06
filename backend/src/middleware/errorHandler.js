const logger = require('../services/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${err.status || 500} — ${err.message} — ${req.method} ${req.url}`);

  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
}

module.exports = { errorHandler, notFound };
