// The app-wide WebSocket (/ws/app) for server pushes, with reconnects.
// Reconnects back off from 1.5 s to 30 s while the server keeps refusing
// (restart, expired session); an open socket starts over.
const RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30_000;
// The server hung up because the session is over (see SESSION_ENDED).
const SESSION_ENDED_CLOSE = 4001;

export function createAppSocket({ onMessage, onOpen, onClose, onReconnecting } = {}) {
  let socket = null;
  let closed = false;
  let reconnectTimer = null;
  let failures = 0;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/app`);

    socket.addEventListener('open', () => {
      failures = 0;
      onOpen?.();
    });

    socket.addEventListener('message', event => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      onMessage?.(message);
    });

    socket.addEventListener('close', (event) => {
      onClose?.();
      if (closed || event?.code === SESSION_ENDED_CLOSE) return;
      onReconnecting?.();
      const delay = Math.min(RECONNECT_DELAY_MS * 2 ** failures, MAX_RECONNECT_DELAY_MS);
      failures += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    });
  }

  connect();

  return {
    sendJson(payload) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    },
    close() {
      closed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
    }
  };
}
