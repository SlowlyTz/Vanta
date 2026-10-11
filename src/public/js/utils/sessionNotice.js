// A message for the login page from a session that ended on the server's
// side (a ban): whoever learns about it first (an API response or the app
// socket) leaves it here, and the login page shows it once.
const NOTICE_KEY = 'vanta.sessionNotice';
const AUTH_UNAUTHORIZED_EVENT = 'vanta:auth-unauthorized';

export function storeSessionNotice({ message, reason = null } = {}) {
  if (!message) return;
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ message, reason }));
  } catch {
    // Private mode: the user still lands on the login, only without the text.
  }
}

export function takeSessionNotice() {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    const notice = raw ? JSON.parse(raw) : null;
    return notice?.message ? notice : null;
  } catch {
    return null;
  }
}

// The server ended this session: drop the user and go to the login, where
// the notice (if any) is waiting.
export function endClientSession(notice = null) {
  if (notice) storeSessionNotice(notice);
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  if (window.location.hash !== '#/login') {
    window.location.hash = '#/login';
  }
}
