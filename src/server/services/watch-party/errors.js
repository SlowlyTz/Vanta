export function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

export function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

export function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}
