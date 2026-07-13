const RECONNECT_DELAY_MS = 1500;

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

    socket.addEventListener('close', () => {
      onClose?.();
      if (closed) return;
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
