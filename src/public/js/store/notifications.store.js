// The bell's feed and the dot counts (own requests and reports decided since last
// seen; for admins, open work). Refreshed on start, on socket notices, on tab return and every minute.
import { NotificationsApi } from '../api/notifications.api.js';
import { Store } from './store.js';

const REFRESH_MS = 60_000;
const EMPTY = { mine: { requests: 0, reports: 0 }, admin: null };

class NotificationsStore extends Store {
  constructor() {
    super();
    this.summary = EMPTY;
    this.feed = { items: [], unread: 0, loaded: false };
    this.timer = null;
    this.loading = null;
    // Bumped by every markRead: a feed answer that left before it would bring
    // the read entries back as unread for a moment.
    this.readSeq = 0;
  }

  getState() {
    const { mine, admin } = this.summary;
    const adminTotal = admin ? admin.requests + admin.reports : 0;
    return { ...this.summary, adminTotal, hasAdminWork: adminTotal > 0, feed: this.feed, unread: this.feed.unread };
  }

  async refresh() {
    if (this.loading) return this.loading;
    const seq = this.readSeq;
    const generation = this.generation;
    // Each part on its own: a failing one leaves the other standing.
    const part = (load, apply) => Promise.resolve().then(load).then(apply).catch(() => {});
    this.loading = Promise.all([
      part(() => NotificationsApi.getSummary(), summary => {
        if (!this.isCurrent(generation)) return;
        this.summary = { mine: { ...EMPTY.mine, ...summary?.mine }, admin: summary?.admin || null };
      }),
      part(() => NotificationsApi.getFeed(), feed => {
        if (seq !== this.readSeq || !this.isCurrent(generation)) return;
        this.feed = { items: feed?.items || [], unread: feed?.unread || 0, loaded: true };
      })
    ])
      .then(() => { if (this.isCurrent(generation)) this.notify(); })
      .finally(() => { if (this.isCurrent(generation)) this.loading = null; });
    return this.loading;
  }

  // The bell's list: one entry or everything read.
  async markRead(id = null) {
    const seq = ++this.readSeq;
    const applyRead = items => items.map(item => (id === null || item.id === id ? { ...item, read: true } : item));
    const before = this.feed;
    this.feed = {
      ...before,
      items: applyRead(before.items),
      unread: id === null ? 0 : Math.max(0, before.unread - (before.items.some(item => item.id === id && !item.read) ? 1 : 0))
    };
    const optimistic = this.feed;
    this.notify();
    try {
      const { unread } = await NotificationsApi.markRead(id);
      // A newer markRead set its own count; this answer is older.
      if (seq !== this.readSeq) return;
      // Whatever arrived meanwhile, these entries stay read.
      this.feed = { ...this.feed, items: applyRead(this.feed.items), unread };
      this.notify();
    } catch {
      if (this.feed !== optimistic) return;
      this.feed = before;
      this.notify();
    }
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
    this.nextGeneration();
    window.clearInterval(this.timer);
    this.timer = null;
    if (this.onVisible) document.removeEventListener('visibilitychange', this.onVisible);
    this.summary = EMPTY;
    this.feed = { items: [], unread: 0, loaded: false };
    this.notify();
  }
}

export const notificationsStore = new NotificationsStore();
