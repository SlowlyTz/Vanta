// Last Express error handler: answers JSON and hides 5xx messages outside development.
import env from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[Server Error]', {
    message: err.message,
    status: err.status || 500,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const status = err.status || 500;
  res.status(status).json({
    error: status < 500 || env.NODE_ENV === 'development'
      ? err.message || 'Interner Serverfehler'
      : 'Interner Serverfehler'
  });
};
