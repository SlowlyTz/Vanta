// Every play, pause or seek the watch-party sync performs itself fires the
// same media event a user action would. Each programmatic change books one
// token for its event; the event consumes it instead of being reported as an
// owner command. Tokens expire, so a change that never produces its event
// (e.g. a seek onto the current frame) cannot swallow a later real action.

export const ECHO_TOKEN_TTL_MS = 3_000;

export function createEchoTokens({ now = () => performance.now(), ttlMs = ECHO_TOKEN_TTL_MS } = {}) {
  const pending = { play: [], pause: [], seek: [] };

  const prune = kind => {
    const current = now();
    const list = pending[kind];
    while (list.length && list[0] <= current) list.shift();
    return list;
  };

  return {
    expect(kind) {
      if (!pending[kind]) return;
      pending[kind].push(now() + ttlMs);
    },
    consume(kind) {
      if (!pending[kind]) return false;
      const list = prune(kind);
      if (!list.length) return false;
      list.shift();
      return true;
    },
    pendingCount(kind) {
      return pending[kind] ? prune(kind).length : 0;
    },
    clear() {
      Object.values(pending).forEach(list => list.splice(0));
    }
  };
}
