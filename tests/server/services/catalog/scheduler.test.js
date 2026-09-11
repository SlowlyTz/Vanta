import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCatalogScheduler, msUntilNextTime } from '../../../../src/server/services/catalog/scheduler.js';

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
  const scheduler = createCatalogScheduler({
    sync,
    settings: settingsApi,
    timers: { setTimeout, clearTimeout, setInterval, clearInterval },
    now: () => new Date(),
    log
  });
  return { sync, settingsApi, scheduler, log };
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
});
