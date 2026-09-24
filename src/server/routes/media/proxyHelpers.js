import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export const FORWARD_HEADERS = {
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

// A browser that seeks drops the segment request it no longer needs. Such
// aborts are expected on both sides: the client closing early, and the
// upstream body failing afterwards ("terminated" from undici, an HTTP/2
// stream reset). None of them may reach the process as an unhandled error.
export function isAbortError(error) {
  return error?.name === 'AbortError'
    || error?.code === 'ERR_STREAM_PREMATURE_CLOSE'
    || error?.code === 'ABORT_ERR'
    || error?.message === 'terminated'
    || error?.cause?.code === 'ERR_HTTP2_STREAM_ERROR'
    || error?.code === 'UND_ERR_ABORTED'
    || error?.code === 'UND_ERR_SOCKET';
}

// Aborts the upstream request once the client connection closes before the
// response was fully sent, so Jellyfin stops producing data nobody reads.
export function upstreamAbortSignal(res) {
  const controller = new AbortController();
  res.once('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}

// The upstream body as a Node stream that can never raise an unhandled
// 'error': undici errors the body with "terminated" when the HTTP/2 stream to
// Jellyfin is reset, which can happen after pipeline() has already settled
// and dropped its listeners (this crashed the server while seeking).
export function toNodeReadable(body) {
  const readable = Readable.fromWeb(body);
  readable.on('error', error => {
    if (!isAbortError(error)) console.warn('[Proxy Stream] Upstream error:', error.message);
  });
  return readable;
}

export async function pipeReadable(response, req, res) {
  const readable = toNodeReadable(response.body);

  res.on('close', () => {
    if (!res.writableEnded) {
      readable.destroy();
    }
  });

  try {
    await pipeline(readable, res);
  } catch (error) {
    if (isAbortError(error) || res.destroyed || !res.writable) {
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
