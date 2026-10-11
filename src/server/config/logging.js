import morgan from 'morgan';

// Query parameters that must never land in a log file.
const SECRET_PARAMS = /^(api_key|apikey|token|access_token|x-emby-token)$/i;

// The request path for the access log: playback proxy URLs carry the whole
// Jellyfin path (stream ids, play sessions) in `path`, so their query is left
// out completely; elsewhere only secret-looking parameters are masked.
export function safeUrl(originalUrl = '') {
  const queryStart = originalUrl.indexOf('?');
  if (queryStart === -1) return originalUrl;
  const pathname = originalUrl.slice(0, queryStart);
  if (pathname.startsWith('/api/media/playback/')) return `${pathname}?…`;

  const params = new URLSearchParams(originalUrl.slice(queryStart + 1));
  let masked = false;
  for (const key of [...params.keys()]) {
    if (SECRET_PARAMS.test(key)) {
      params.set(key, '***');
      masked = true;
    }
  }
  return masked ? `${pathname}?${params.toString()}` : originalUrl;
}

morgan.token('safe-url', req => safeUrl(req.originalUrl || req.url));

export function logFormat(nodeEnv) {
  return nodeEnv === 'development'
    ? ':method :safe-url :status :response-time ms - :res[content-length]'
    : ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
}
