import { NotificationsApi } from '../api/notifications.api.js';

const REFRESH_MS = 60_000;
const EMPTY = { mine: { requests: 0, reports: 0 }, admin: null };

// Counts behind the dots in the menu, the settings dialog and the admin area:
// the user's own requests and reports decided since they last looked, and for
// admins what still waits for a decision. Refreshed on start, when the app
// socket says something changed, when the tab comes back, and once a minute.
class NotificationsStore {
  constructor() {
    this.summary = EMPTY;
    this.listeners = new Set();
    this.timer = null;
    this.loading = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState() {
    const { mine, admin } = this.summary;
    const adminTotal = admin ? admin.requests + admin.reports : 0;
    return { ...this.summary, adminTotal, hasAdminWork: adminTotal > 0 };
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  async refresh() {
    if (this.loading) return this.loading;
    this.loading = NotificationsApi.getSummary()
      .then(summary => {
        this.summary = { mine: { ...EMPTY.mine, ...summary?.mine }, admin: summary?.admin || null };
        this.notify();
      })
      .catch(() => {})
      .finally(() => { this.loading = null; });
    return this.loading;
  }

  // Opening "Meine Anfragen" / "Meine Meldungen" clears that dot. Returns when
  // the user looked before, so the list can mark what is new since then.
  async markSeen(kind) {
    try {
      const { previousSeenAt } = await NotificationsApi.markSeen(kind);
      this.summary = { ...this.summary, mine: { ...this.summary.mine, [kind]: 0 } };
      this.notify();
      return previousSeenAt || 0;
    } catch {
      return 0;
    }
  }

  start() {
    if (this.timer) return;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), REFRESH_MS);
    this.onVisible = () => { if (document.visibilityState === 'visible') this.refresh(); };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = null;
    if (this.onVisible) document.removeEventListener('visibilitychange', this.onVisible);
    this.summary = EMPTY;
    this.notify();
  }
}

export const notificationsStore = new NotificationsStore();
