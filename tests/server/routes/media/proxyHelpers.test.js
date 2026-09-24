import { describe, it, expect, vi, afterEach } from 'vitest';
import http from 'http';
import { pipeReadable, isAbortError, toNodeReadable, upstreamAbortSignal } from '../../../../src/server/routes/media/proxyHelpers.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// A body like undici's over HTTP/2: once the browser drops the request, the
// proxy cancels the body, and cancelling fails because the upstream stream
// was reset ("terminated"). That error arrives after pipeline() has settled.
function upstreamBody() {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(64 * 1024));
    },
    cancel() {
      return new Promise((resolve, reject) => setTimeout(() => {
        reject(Object.assign(new TypeError('terminated'), { cause: { code: 'ERR_HTTP2_STREAM_ERROR' } }));
      }, 5));
    }
  });
}

describe('pipeReadable', () => {
  let server;
  afterEach(() => new Promise(resolve => (server ? server.close(resolve) : resolve())));

  it('überlebt einen Upstream-Abbruch, nachdem der Browser die Anfrage verworfen hat', async () => {
    const body = upstreamBody();
    const piped = new Promise(resolve => {
      server = http.createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'video/mp2t' });
        resolve(pipeReadable({ body }, req, res));
      }).listen(0);
    });
    await new Promise(resolve => server.once('listening', resolve));

    const uncaught = vi.fn();
    process.on('uncaughtException', uncaught);
    try {
      await new Promise(resolve => {
        const request = http.get({ port: server.address().port }, response => {
          response.once('data', () => {
            request.destroy();
            resolve();
          });
        });
        request.on('error', () => {});
      });
      await expect(piped).resolves.toBeUndefined();
      await wait(40);
      expect(uncaught).not.toHaveBeenCalled();
    } finally {
      process.off('uncaughtException', uncaught);
    }
  });

  it('lässt einen späten Upstream-Fehler nie unbehandelt (Crash beim Spulen)', async () => {
    const readable = toNodeReadable(new ReadableStream({ start() {} }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const uncaught = vi.fn();
    process.on('uncaughtException', uncaught);
    try {
      readable.destroy(Object.assign(new TypeError('terminated'), { cause: { code: 'ERR_HTTP2_STREAM_ERROR' } }));
      await wait(20);
      expect(uncaught).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.off('uncaughtException', uncaught);
      warn.mockRestore();
    }
  });

  it('erkennt Abbrüche von Browser und Upstream', () => {
    expect(isAbortError(new TypeError('terminated'))).toBe(true);
    expect(isAbortError(Object.assign(new Error('x'), { code: 'ERR_STREAM_PREMATURE_CLOSE' }))).toBe(true);
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('ECONNREFUSED'))).toBe(false);
  });

  it('bricht die Jellyfin-Anfrage ab, wenn der Browser vorher geht', () => {
    const listeners = {};
    const res = { writableFinished: false, once: (event, fn) => { listeners[event] = fn; } };
    const signal = upstreamAbortSignal(res);
    expect(signal.aborted).toBe(false);
    listeners.close();
    expect(signal.aborted).toBe(true);

    const done = { writableFinished: true, once: (event, fn) => { listeners[event] = fn; } };
    const kept = upstreamAbortSignal(done);
    listeners.close();
    expect(kept.aborted).toBe(false);
  });
});
