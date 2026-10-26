// Errors that carry the HTTP status the route answers with.
export function httpError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status }, extra);
}

export const badRequest = (message, extra) => httpError(400, message, extra);
export const forbidden = (message, extra) => httpError(403, message, extra);
export const notFound = (message, extra) => httpError(404, message, extra);
export const conflict = (message, extra) => httpError(409, message, extra);
export const gone = (message, extra) => httpError(410, message, extra);
