const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error('Server error', { error: err.message, url: req.url, method: req.method });
  }
  res.status(status).json({
    error: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
