const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 10000;

export function createWatchPartySocket({ partyId, onMessage, onOpen, onClose, onReconnecting }) {
  let socket = null;
  let closedByClient = false;
  let reconnectAttempt = 0;
  let reconnectTimer = null;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/watch-party/${encodeURIComponent(partyId)}`);

    socket.addEventListener('open', () => {
      reconnectAttempt = 0;
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

    socket.addEventListener('close', () => {
      onClose?.();
      if (closedByClient) return;

      const delay = Math.min(RECONNECT_DELAY_MS * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
      reconnectAttempt += 1;
      onReconnecting?.();
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
      closedByClient = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
    }
  };
}
