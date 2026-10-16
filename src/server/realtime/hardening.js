// Shared protection for the app and watch-party WebSockets.

// Every message both sockets know is a small JSON object; 64 KB is far above
// any of them and far below the 100 MiB the ws library would accept.
export const WS_MAX_PAYLOAD = 64 * 1024;

export const HEARTBEAT_INTERVAL_MS = 30 * 1000;

// A WebSocket handshake is not bound by the same-origin policy, so a page on
// another site (or a sibling subdomain the session cookie reaches) could open
// one with the user's cookie. Browsers always send Origin; it must name the
// host the request was made to. Clients without Origin are not browsers and
// still need the session cookie.
export function isAllowedOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [req.headers.host, req.headers['x-forwarded-host']]
    .filter(Boolean)
    .flatMap(value => String(value).split(',').map(part => part.trim()));
  return hosts.includes(originHost);
}

export function rejectUpgrade(socket, status, text) {
  try {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  } catch { /* already gone */ }
  socket.destroy();
}

// The handlers for /ws/app and /ws/watch-party/ each ignore other paths; this
// last listener closes anything neither of them takes instead of leaving the
// connection hanging.
export function rejectUnknownUpgrades(server, isKnownPath) {
  server.on('upgrade', (req, socket) => {
    let pathname = '';
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch { /* malformed: rejected below */ }
    if (!isKnownPath(pathname)) rejectUpgrade(socket, 404, 'Not Found');
  });
}

// A frame over WS_MAX_PAYLOAD, invalid UTF-8 or a bad opcode makes ws emit
// 'error' on the socket; without a listener that is an uncaught exception and
// takes the whole server down. The socket is cut off instead, which runs the
// normal close handling.
export function guardSocketErrors(ws, { log = console } = {}) {
  ws.on('error', error => {
    log.warn?.('[WebSocket] connection dropped:', error?.message || error);
    try { ws.terminate(); } catch { /* already gone */ }
  });
}

// Pings every client on an interval; one that has not answered the previous
// ping is gone (a phone that lost its network sends no close) and is cut off,
// which runs the same close handling as a normal disconnect. Also guards every
// socket against errors (see guardSocketErrors).
export function startHeartbeat(wss, { intervalMs = HEARTBEAT_INTERVAL_MS } = {}) {
  wss.on('connection', ws => {
    guardSocketErrors(ws);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* closing */ }
    }
  }, intervalMs);
  timer.unref?.();
  wss.on('close', () => clearInterval(timer));
  return () => clearInterval(timer);
}

// Token bucket per socket: short bursts (a reconnect sends a few clock pings
// at once) are fine, a flood closes the socket with 1008 (policy violation).
export function limitMessageRate(ws, { burst = 60, perSecond = 20, now = () => Date.now() } = {}) {
  let tokens = burst;
  let last = now();
  ws.on('message', () => {
    const time = now();
    tokens = Math.min(burst, tokens + ((time - last) / 1000) * perSecond);
    last = time;
    tokens -= 1;
    if (tokens < 0) {
      ws.close(1008, 'Too many messages');
    }
  });
}
