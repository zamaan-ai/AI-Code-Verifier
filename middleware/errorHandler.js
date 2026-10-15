function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }
  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
