import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export const FORWARD_HEADERS = {
  stream: [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control'
  ],
  playback: [
    'content-type',
    'content-range',
    'accept-ranges',
    'cache-control'
    // content-length is added selectively in playback.routes.js for non-HLS responses;
    // HLS playlists must not receive content-length to avoid confusing Safari/hls.js.
  ]
};

export function forwardHeaders(response, res, headers) {
  headers.forEach(header => {
    const value = response.headers.get(header);
    if (value) res.setHeader(header, value);
  });
}

export async function pipeReadable(response, req, res) {
  const readable = Readable.fromWeb(response.body);

  res.on('close', () => {
    if (!res.writableEnded) {
      readable.destroy();
    }
  });

  try {
    await pipeline(readable, res);
  } catch (error) {
    if (error.code === 'ERR_STREAM_PREMATURE_CLOSE' || res.destroyed || !res.writable) {
      return;
    }
    throw error;
  }
}

export function getSvgPlaceholder(type) {
  const width = type === 'Backdrop' ? 320 : 200;
  const height = type === 'Backdrop' ? 180 : 300;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="hsl(240, 10%, 10%)"/>
      <circle cx="${width / 2}" cy="${height / 2 - 20}" r="24" fill="hsl(240, 10%, 18%)" />
      <path d="M${width / 2 - 8} ${height / 2 - 28} L${width / 2 + 12} ${height / 2 - 20} L${width / 2 - 8} ${height / 2 - 12} Z" fill="hsl(240, 5%, 65%)"/>
      <text x="50%" y="${height / 2 + 30}" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, sans-serif" font-weight="500" font-size="12" fill="hsl(240, 5%, 65%)">Bild nicht verfügbar</text>
    </svg>
  `.trim();
}

export function ensureContentType(res, fallback = 'video/mp4') {
  const contentType = res.getHeader('content-type');
  if (!contentType || contentType === 'application/octet-stream') {
    res.setHeader('content-type', fallback);
  }
}
