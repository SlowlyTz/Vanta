import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  isAllowedOrigin, limitMessageRate, rejectUnknownUpgrades, startHeartbeat, WS_MAX_PAYLOAD
} from '../../../src/server/realtime/hardening.js';

const fakeWs = () => Object.assign(new EventEmitter(), { close: vi.fn(), ping: vi.fn(), terminate: vi.fn() });

describe('isAllowedOrigin', () => {
  const req = (origin, host = 'app.usevanta.de', extra = {}) => ({ headers: { origin, host, ...extra } });

  it('accepts the page\'s own origin and clients without one', () => {
    expect(isAllowedOrigin(req('https://app.usevanta.de'))).toBe(true);
    expect(isAllowedOrigin(req('http://localhost:3000', 'localhost:3000'))).toBe(true);
    expect(isAllowedOrigin(req(undefined))).toBe(true);
  });

  it('refuses other sites, sibling subdomains and garbage', () => {
    expect(isAllowedOrigin(req('https://evil.example'))).toBe(false);
    expect(isAllowedOrigin(req('https://jellyfin.usevanta.de'))).toBe(false);
    expect(isAllowedOrigin(req('null'))).toBe(false);
  });

  it('accepts the host a proxy forwarded', () => {
    expect(isAllowedOrigin(req('https://app.usevanta.de', '10.0.3.58:3000', { 'x-forwarded-host': 'app.usevanta.de' }))).toBe(true);
  });
});

describe('limitMessageRate', () => {
  it('allows bursts and closes a flooding socket', () => {
    let time = 0;
    const ws = fakeWs();
    limitMessageRate(ws, { burst: 5, perSecond: 2, now: () => time });

    for (let i = 0; i < 5; i++) ws.emit('message');
    expect(ws.close).not.toHaveBeenCalled();
    ws.emit('message');
    expect(ws.close).toHaveBeenCalledWith(1008, 'Too many messages');
  });

  it('refills over time', () => {
    let time = 0;
    const ws = fakeWs();
    limitMessageRate(ws, { burst: 2, perSecond: 2, now: () => time });
    for (let i = 0; i < 20; i++) {
      time += 500;
      ws.emit('message');
    }
    expect(ws.close).not.toHaveBeenCalled();
  });
});

describe('startHeartbeat', () => {
  afterEach(() => vi.useRealTimers());

  it('pings clients and drops the ones that never answer', () => {
    vi.useFakeTimers();
    const wss = Object.assign(new EventEmitter(), { clients: new Set() });
    const stop = startHeartbeat(wss, { intervalMs: 1000 });
    const alive = fakeWs();
    const dead = fakeWs();
    for (const ws of [alive, dead]) {
      wss.clients.add(ws);
      wss.emit('connection', ws);
    }

    vi.advanceTimersByTime(1000);
    expect(alive.ping).toHaveBeenCalledTimes(1);
    alive.emit('pong');

    vi.advanceTimersByTime(1000);
    expect(alive.terminate).not.toHaveBeenCalled();
    expect(dead.terminate).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('rejectUnknownUpgrades', () => {
  it('closes upgrades to paths no socket server takes', () => {
    const server = new EventEmitter();
    rejectUnknownUpgrades(server, path => path === '/ws/app');
    const unknown = { write: vi.fn(), destroy: vi.fn() };
    const known = { write: vi.fn(), destroy: vi.fn() };

    server.emit('upgrade', { url: '/ws/other' }, unknown);
    server.emit('upgrade', { url: '/ws/app' }, known);

    expect(unknown.write.mock.calls[0][0]).toMatch(/^HTTP\/1\.1 404/);
    expect(unknown.destroy).toHaveBeenCalled();
    expect(known.destroy).not.toHaveBeenCalled();
  });
});

it('caps the payload far below the ws default', () => {
  expect(WS_MAX_PAYLOAD).toBe(64 * 1024);
});

describe('socket errors', () => {
  it('a frame over the payload cap closes that socket instead of crashing the server', async () => {
    const server = http.createServer();
    const wss = new WebSocketServer({ server, maxPayload: WS_MAX_PAYLOAD });
    const stop = startHeartbeat(wss, { intervalMs: 60_000 });
    const uncaught = vi.fn();
    process.on('uncaughtException', uncaught);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const serverSide = new Promise(resolve => wss.on('connection', ws => resolve(ws)));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    try {
      const client = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
      await new Promise(resolve => client.on('open', resolve));
      const ws = await serverSide;
      const closed = new Promise(resolve => ws.on('close', resolve));
      client.on('error', () => {});
      client.send('x'.repeat(WS_MAX_PAYLOAD + 10_000));
      await closed;

      expect(uncaught).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith('[WebSocket] connection dropped:', expect.stringContaining('Max payload'));
    } finally {
      process.off('uncaughtException', uncaught);
      warn.mockRestore();
      stop();
      wss.close();
      await new Promise(resolve => server.close(resolve));
    }
  });
});
