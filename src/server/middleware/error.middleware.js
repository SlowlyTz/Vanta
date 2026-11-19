// Last Express error handler: answers JSON and hides 5xx messages outside development.
import env from '../config/env.js';

// The JSON body parser's own errors (broken or too large bodies) carry English
// parser text; the client gets a German one instead.
const BODY_ERRORS = {
  'entity.parse.failed': 'Ungültige Anfrage',
  'entity.too.large': 'Anfrage zu groß'
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[Server Error]', {
    message: err.message,
    status: err.status || 500,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const status = err.status || 500;
  const bodyError = BODY_ERRORS[err.type];
  res.status(status).json({
    error: bodyError || (status < 500 || env.NODE_ENV === 'development'
      ? err.message || 'Interner Serverfehler'
      : 'Interner Serverfehler')
  });
};
