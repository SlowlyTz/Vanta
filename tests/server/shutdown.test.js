import { describe, it, expect, vi, afterEach } from 'vitest';
import { createShutdown, SERVICE_RESTART } from '../../src/server/shutdown.js';

const fakeServer = () => {
  const server = { close: vi.fn(), closeIdleConnections: vi.fn() };
  server.close.mockImplementation(cb => { server.onClosed = cb; });
  return server;
};

const fakeSockets = () => {
  const client = { close: vi.fn() };
  return { client, wss: { clients: new Set([client]), close: vi.fn() } };
};

describe('createShutdown', () => {
  afterEach(() => vi.useRealTimers());

  it('stops jobs, closes sockets, writes the databases and exits once the server closed', () => {
    const server = fakeServer();
    const { client, wss } = fakeSockets();
    const order = [];
    const exit = vi.fn(() => order.push('exit'));
    const shutdown = createShutdown({
      server,
      socketServers: [wss],
      stopJobs: [() => order.push('stop')],
      flushes: [() => order.push('flush')],
      exit,
      log: {}
    });

    shutdown('SIGINT');
    expect(client.close).toHaveBeenCalledWith(SERVICE_RESTART, 'Server restart');
    expect(wss.close).toHaveBeenCalled();
    expect(server.closeIdleConnections).toHaveBeenCalled();
    expect(order).toEqual(['stop', 'flush']);
    expect(exit).not.toHaveBeenCalled();

    server.onClosed();
    expect(order).toEqual(['stop', 'flush', 'flush', 'exit']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits after the timeout when requests stay open', () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    const flush = vi.fn();
    const shutdown = createShutdown({ server: fakeServer(), flushes: [flush], timeoutMs: 1500, exit, log: {} });

    shutdown();
    vi.advanceTimersByTime(1499);
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(exit).toHaveBeenCalledWith(0);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('keeps going when one step throws and exits at once on a second signal', () => {
    const exit = vi.fn();
    const flush = vi.fn();
    const shutdown = createShutdown({
      server: fakeServer(),
      stopJobs: [() => { throw new Error('boom'); }],
      flushes: [flush],
      exit,
      log: { error: vi.fn(), log: vi.fn() }
    });

    shutdown();
    expect(flush).toHaveBeenCalled();
    shutdown();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
