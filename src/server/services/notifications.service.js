// The dots in the menu: decided requests and handled reports since a user
// last looked, and for admins what still waits for a decision.
import db from '../db/database.js';
import { httpError } from '../utils/httpError.js';

const KINDS = ['requests', 'reports'];

const getSeen = db.prepare('SELECT seen_at FROM notification_seen WHERE user_id = ? AND kind = ?');
const setSeen = db.prepare(`
  INSERT INTO notification_seen (user_id, kind, seen_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id, kind) DO UPDATE SET seen_at = excluded.seen_at
`);
const countOpenRequests = db.prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'pending'");
const countOpenReports = db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");
const countDecidedRequests = db.prepare("SELECT COUNT(*) AS n FROM requests WHERE user_id = ? AND status != 'pending' AND updated_at > ?");
const countHandledReports = db.prepare("SELECT COUNT(*) AS n FROM reports WHERE user_id = ? AND status != 'open' AND updated_at > ?");

// The first look starts the clock, so older decisions do not all light up
// at once.
const seenAt = (userId, kind) => {
  const row = getSeen.get(userId, kind);
  if (row) return row.seen_at;
  const now = Date.now();
  setSeen.run(userId, kind, now);
  return now;
};

export class NotificationsService {
  static getSummary(userId, { isAdmin = false } = {}) {
    const summary = {
      mine: {
        requests: countDecidedRequests.get(userId, seenAt(userId, 'requests')).n,
        reports: countHandledReports.get(userId, seenAt(userId, 'reports')).n
      },
      admin: null
    };
    if (isAdmin) {
      summary.admin = {
        requests: countOpenRequests.get().n,
        reports: countOpenReports.get().n
      };
    }
    return summary;
  }

  // Returns the previous seen time, so the page can mark what is new.
  static markSeen(userId, kind) {
    if (!KINDS.includes(kind)) {
      throw httpError(400, 'Unbekannte Art');
    }
    const previous = seenAt(userId, kind);
    setSeen.run(userId, kind, Date.now());
    return previous;
  }
}
