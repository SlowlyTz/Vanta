// Hands a rejected async route handler's error on to Express's error handling.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
