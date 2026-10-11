const RECONNECT_DELAY_MS = 1500;
// The server hung up because the session is over (see SESSION_ENDED).
const SESSION_ENDED_CLOSE = 4001;

export function createAppSocket({ onMessage, onOpen, onClose, onReconnecting } = {}) {
  let socket = null;
  let closed = false;
  let reconnectTimer = null;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/app`);

    socket.addEventListener('open', () => onOpen?.());

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
      reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
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
