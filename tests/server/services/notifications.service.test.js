import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));

const { NotificationsService } = await import('../../../src/server/services/notifications.service.js');

const addRequest = (status, userId, updatedAt) =>
  memory.prepare('INSERT INTO requests (status, user_id, updated_at) VALUES (?, ?, ?)').run(status, userId, updatedAt);
const addReport = (status, userId, updatedAt) =>
  memory.prepare("INSERT INTO reports (item_id, item_type, title, problem, status, user_id, created_at, updated_at) VALUES ('i', 'Movie', 'T', 'playback', ?, ?, 0, ?)")
    .run(status, userId, updatedAt);

describe('NotificationsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    memory.exec('DELETE FROM requests; DELETE FROM reports; DELETE FROM notification_seen;');
  });

  it('counts what waits for an admin, and nothing of that for other users', () => {
    addRequest('pending', 'u2', 1);
    addRequest('approved', 'u2', 1);
    addReport('open', 'u3', 1);

    expect(NotificationsService.getSummary('admin', { isAdmin: true }).admin).toEqual({ requests: 1, reports: 1 });
    expect(NotificationsService.getSummary('u9').admin).toBeNull();
  });

  it('lights up decisions after the first look until the user looks again', () => {
    addRequest('approved', 'u1', 500); // before the user ever looked
    expect(NotificationsService.getSummary('u1').mine).toEqual({ requests: 0, reports: 0 });

    vi.setSystemTime(2_000_000);
    addRequest('rejected', 'u1', 2_000_000);
    addReport('resolved', 'u1', 2_000_000);
    addRequest('pending', 'u1', 2_000_000);
    expect(NotificationsService.getSummary('u1').mine).toEqual({ requests: 1, reports: 1 });

    vi.setSystemTime(3_000_000);
    expect(NotificationsService.markSeen('u1', 'requests')).toBe(1_000_000);
    expect(NotificationsService.getSummary('u1').mine).toEqual({ requests: 0, reports: 1 });
    expect(() => NotificationsService.markSeen('u1', 'everything')).toThrow();
    vi.useRealTimers();
  });
});
