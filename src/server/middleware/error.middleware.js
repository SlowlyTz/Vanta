export const errorHandler = (err, req, res, next) => {
  console.error('[Server Error]', {
    message: err.message,
    status: err.status || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
};
