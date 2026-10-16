import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCatalogScheduler, msUntilNextTime, FULL_RETRY_MS, FULL_RETRY_LIMIT } from '../../../../src/server/services/catalog/scheduler.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function setup({ empty = false, settings = { updateIntervalMinutes: 10, fullSyncTime: '03:00' } } = {}) {
  const sync = {
    isEmpty: vi.fn(() => empty),
    runUpdate: vi.fn(async () => ({ type: 'update', total: 5, error: null })),
    runFull: vi.fn(async () => ({ type: 'full', total: 5, error: null }))
  };
  const current = { ...settings };
  const settingsApi = { read: vi.fn(() => ({ ...current })), current };
  const log = { warn: vi.fn(), info: vi.fn() };
  const notifyFailure = vi.fn(async () => {});
  const scheduler = createCatalogScheduler({
    sync,
    settings: settingsApi,
    timers: { setTimeout, clearTimeout, setInterval, clearInterval },
    now: () => new Date(),
    log,
    notifyFailure
  });
  return { sync, settingsApi, scheduler, log, notifyFailure };
}

describe('msUntilNextTime', () => {
  it('targets today when the time is still ahead', () => {
    const from = new Date(2026, 0, 1, 1, 0, 0);
    expect(msUntilNextTime('03:00', from)).toBe(2 * HOUR);
  });

  it('rolls over to tomorrow when the time has passed', () => {
    const from = new Date(2026, 0, 1, 4, 0, 0);
    expect(msUntilNextTime('03:00', from)).toBe(23 * HOUR);
  });

  it('rolls over when the time is exactly now', () => {
    const from = new Date(2026, 0, 1, 3, 0, 0);
    expect(msUntilNextTime('03:00', from)).toBe(24 * HOUR);
  });
});

describe('CatalogScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fills an empty catalogue with a full run at start', () => {
    const { sync, scheduler } = setup({ empty: true });
    scheduler.start();

    expect(sync.runFull).toHaveBeenCalledTimes(1);
    expect(sync.runUpdate).not.toHaveBeenCalled();
  });

  it('refreshes an existing catalogue with an update run at start', () => {
    const { sync, scheduler } = setup();
    scheduler.start();

    expect(sync.runUpdate).toHaveBeenCalledTimes(1);
    expect(sync.runFull).not.toHaveBeenCalled();
  });

  it('runs the update on every interval', () => {
    const { sync, scheduler } = setup();
    scheduler.start();
    sync.runUpdate.mockClear();

    vi.advanceTimersByTime(10 * MINUTE - 1);
    expect(sync.runUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(sync.runUpdate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20 * MINUTE);
    expect(sync.runUpdate).toHaveBeenCalledTimes(3);
  });

  it('runs the full sync at the configured time and again the next day', async () => {
    const { sync, scheduler } = setup();
    scheduler.start();

    // 12:00 -> 03:00 next day is 15 hours away.
    vi.advanceTimersByTime(15 * HOUR - 1);
    expect(sync.runFull).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(sync.runFull).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(24 * HOUR);
    expect(sync.runFull).toHaveBeenCalledTimes(2);
  });

  it('re-arms both timers from the stored settings on reload', () => {
    const { sync, settingsApi, scheduler } = setup();
    scheduler.start();
    sync.runUpdate.mockClear();

    settingsApi.current.updateIntervalMinutes = 2;
    settingsApi.current.fullSyncTime = '13:00';
    scheduler.reload();

    vi.advanceTimersByTime(2 * MINUTE);
    expect(sync.runUpdate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(58 * MINUTE);
    expect(sync.runFull).toHaveBeenCalledTimes(1);
  });

  it('does nothing on reload before start', () => {
    const { sync, scheduler } = setup();
    scheduler.reload();
    vi.advanceTimersByTime(HOUR);

    expect(sync.runUpdate).not.toHaveBeenCalled();
    expect(scheduler.getPlan().started).toBe(false);
  });

  it('stops every timer', () => {
    const { sync, scheduler } = setup();
    scheduler.start();
    sync.runUpdate.mockClear();
    scheduler.stop();

    vi.advanceTimersByTime(48 * HOUR);
    expect(sync.runUpdate).not.toHaveBeenCalled();
    expect(sync.runFull).not.toHaveBeenCalled();
  });

  it('starts only once', () => {
    const { sync, scheduler } = setup();
    scheduler.start();
    scheduler.start();

    expect(sync.runUpdate).toHaveBeenCalledTimes(1);
  });

  it('exposes the plan with the next run times', () => {
    const { scheduler } = setup();
    scheduler.start();

    const plan = scheduler.getPlan();
    expect(plan).toMatchObject({ started: true, updateIntervalMinutes: 10, fullSyncTime: '03:00' });
    expect(plan.nextUpdateAt - Date.now()).toBe(10 * MINUTE);
    expect(plan.nextFullAt - Date.now()).toBe(15 * HOUR);
  });

  it('logs a failed initial run instead of throwing', async () => {
    const { sync, scheduler, log } = setup();
    sync.runUpdate.mockResolvedValueOnce({ type: 'update', error: 'jellyfin down' });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('initial sync failed'), 'jellyfin down');
  });

  describe('full run while an update runs', () => {
    const busy = { type: 'full', busy: true, error: null };

    it('tries again in ten minutes and then runs', async () => {
      const { sync, scheduler, notifyFailure } = setup();
      sync.runFull.mockResolvedValueOnce(busy);
      scheduler.start();
      await vi.advanceTimersByTimeAsync(15 * HOUR);
      expect(sync.runFull).toHaveBeenCalledTimes(1);
      expect(scheduler.getPlan().fullRetryPending).toBe(true);

      await vi.advanceTimersByTimeAsync(FULL_RETRY_MS);
      expect(sync.runFull).toHaveBeenCalledTimes(2);
      expect(scheduler.getPlan()).toMatchObject({ fullRetryPending: false, fullAttempts: 0 });
      expect(notifyFailure).not.toHaveBeenCalled();
    });

    it('tells the admins once after ten tries that did not happen or failed', async () => {
      const { sync, scheduler, notifyFailure } = setup();
      sync.runFull.mockResolvedValue(busy);
      sync.runFull.mockResolvedValueOnce({ type: 'full', error: 'Jellyfin down' });
      scheduler.start();
      await vi.advanceTimersByTimeAsync(15 * HOUR);
      await vi.advanceTimersByTimeAsync(FULL_RETRY_MS * (FULL_RETRY_LIMIT - 1));

      expect(sync.runFull).toHaveBeenCalledTimes(FULL_RETRY_LIMIT);
      expect(notifyFailure).toHaveBeenCalledTimes(1);
      expect(notifyFailure).toHaveBeenCalledWith({ attempts: FULL_RETRY_LIMIT, reason: 'ein Aktualisierungslauf lief noch' });
      await vi.advanceTimersByTimeAsync(FULL_RETRY_MS * 3);
      expect(sync.runFull).toHaveBeenCalledTimes(FULL_RETRY_LIMIT);
    });

    it('the admin button joins pending retries instead of starting more', async () => {
      const { sync, scheduler } = setup();
      sync.runFull.mockResolvedValueOnce(busy);
      expect(await scheduler.requestFull()).toEqual(busy);
      expect(await scheduler.requestFull()).toMatchObject({ queued: true });
      expect(sync.runFull).toHaveBeenCalledTimes(1);
      scheduler.stop();
    });
  });
});
