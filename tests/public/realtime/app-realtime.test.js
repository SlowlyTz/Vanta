import { describe, it, expect, vi } from 'vitest';

const listeners = [];

vi.mock('../../../src/public/js/store/auth.store.js', () => ({
  authStore: {
    subscribe: vi.fn(listener => {
      listeners.push(listener);
      return () => {};
    })
  }
}));

const { mockSocket, createAppSocket } = vi.hoisted(() => {
  const mockSocket = { sendJson: vi.fn(), close: vi.fn() };
  return { mockSocket, createAppSocket: vi.fn(() => mockSocket) };
});

vi.mock('../../../src/public/js/realtime/app.socket.js', () => ({ createAppSocket }));

vi.mock('../../../src/public/js/store/watch-party-invitations.store.js', () => ({
  watchPartyInvitationStore: {
    handleRealtimeMessage: vi.fn(),
    loadPending: vi.fn(),
    clear: vi.fn()
  }
}));

import { initAppRealtime } from '../../../src/public/js/realtime/app-realtime.js';
import { watchPartyInvitationStore } from '../../../src/public/js/store/watch-party-invitations.store.js';

function emitAuth(state) {
  listeners.forEach(listener => listener(state));
}

describe('initAppRealtime', () => {
  it('deckt den vollständigen Auth-Lifecycle ab: öffnen, deduplizieren, weiterleiten, schließen, wieder öffnen', () => {
    initAppRealtime();

    // Nicht authentifiziert: nichts passiert.
    emitAuth({ isAuthenticated: false });
    expect(createAppSocket).not.toHaveBeenCalled();

    // Authentifiziert: Socket öffnet und Pending Invitations werden geladen.
    emitAuth({ isAuthenticated: true });
    expect(createAppSocket).toHaveBeenCalledTimes(1);
    expect(watchPartyInvitationStore.loadPending).toHaveBeenCalledTimes(1);

    // Eingehende Nachrichten werden an den Store weitergeleitet.
    const onMessage = createAppSocket.mock.calls[0][0].onMessage;
    onMessage({ type: 'WATCH_PARTY_INVITATION' });
    expect(watchPartyInvitationStore.handleRealtimeMessage).toHaveBeenCalledWith({ type: 'WATCH_PARTY_INVITATION' });

    // Weitere authentifizierte Notifies erzeugen keinen zweiten Socket.
    emitAuth({ isAuthenticated: true });
    emitAuth({ isAuthenticated: true });
    expect(createAppSocket).toHaveBeenCalledTimes(1);
    expect(watchPartyInvitationStore.loadPending).toHaveBeenCalledTimes(1);

    // Logout schließt den Socket und leert den Store.
    emitAuth({ isAuthenticated: false });
    expect(mockSocket.close).toHaveBeenCalledTimes(1);
    expect(watchPartyInvitationStore.clear).toHaveBeenCalledTimes(1);

    // Erneutes Login öffnet einen neuen Socket.
    emitAuth({ isAuthenticated: true });
    expect(createAppSocket).toHaveBeenCalledTimes(2);

    // Ein Ban beendet die Sitzung: Login mit Grund, auch mitten in der Wiedergabe.
    window.location.hash = '#/player/item-1';
    const unauthorized = vi.fn();
    window.addEventListener('vanta:auth-unauthorized', unauthorized);
    createAppSocket.mock.calls[1][0].onMessage({ type: 'SESSION_ENDED', code: 'BANNED', error: 'Dein Konto wurde gesperrt.', reason: 'Spam' });
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/login');
    expect(JSON.parse(sessionStorage.getItem('vanta.sessionNotice'))).toEqual({ message: 'Dein Konto wurde gesperrt.', reason: 'Spam' });
    window.removeEventListener('vanta:auth-unauthorized', unauthorized);
    sessionStorage.clear();
  });
});
