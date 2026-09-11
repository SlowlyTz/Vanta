const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Milliseconds from `from` until the next local occurrence of HH:MM.
export const msUntilNextTime = (time, from = new Date()) => {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= from.getTime()) next.setTime(next.getTime() + DAY);
  return next.getTime() - from.getTime();
};

// Two timers: a repeating update run and a daily full run. Both are re-armed
// from the stored settings whenever `reload()` is called, so an admin change
// takes effect without a restart.
export function createCatalogScheduler({
  sync,
  settings,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  now = () => new Date(),
  log = console
}) {
  let updateTimer = null;
  let fullTimer = null;
  let started = false;
  let nextFullAt = null;
  let nextUpdateAt = null;

  const clear = () => {
    if (updateTimer) timers.clearInterval(updateTimer);
    if (fullTimer) timers.clearTimeout(fullTimer);
    updateTimer = null;
    fullTimer = null;
  };

  const armFull = (time) => {
    const delay = msUntilNextTime(time, now());
    nextFullAt = now().getTime() + delay;
    fullTimer = timers.setTimeout(async () => {
      await sync.runFull();
      armFull(settings.read().fullSyncTime);
    }, delay);
  };

  const armUpdate = (minutes) => {
    const interval = minutes * MINUTE;
    nextUpdateAt = now().getTime() + interval;
    updateTimer = timers.setInterval(() => {
      nextUpdateAt = now().getTime() + interval;
      sync.runUpdate();
    }, interval);
  };

  const arm = () => {
    clear();
    const { updateIntervalMinutes, fullSyncTime } = settings.read();
    armUpdate(updateIntervalMinutes);
    armFull(fullSyncTime);
  };

  // A fresh install has no catalogue yet; fill it right away so the first page
  // view is never empty. An existing one only gets the cheap update run.
  const start = () => {
    if (started) return;
    started = true;
    arm();

    const initial = sync.isEmpty() ? sync.runFull() : sync.runUpdate();
    initial.then(record => {
      if (record?.error) log.warn('[CatalogScheduler] initial sync failed:', record.error);
    });
  };

  const stop = () => {
    clear();
    started = false;
  };

  return {
    start,
    stop,
    reload: () => { if (started) arm(); },
    getPlan: () => ({
      started,
      nextUpdateAt,
      nextFullAt,
      ...settings.read()
    })
  };
}
