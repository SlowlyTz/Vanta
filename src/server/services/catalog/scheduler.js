// Timers for the catalogue sync: a repeating update run and a daily full run with retries.
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
// A full run that could not happen (an update was running) or failed is
// tried again this often before the admins are told.
export const FULL_RETRY_MS = 10 * MINUTE;
export const FULL_RETRY_LIMIT = 10;

// Milliseconds from `from` until the next local occurrence of HH:MM.
export const msUntilNextTime = (time, from = new Date()) => {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= from.getTime()) next.setTime(next.getTime() + DAY);
  return next.getTime() - from.getTime();
};

// Both timers are re-armed from the stored settings on `reload()`, so an admin change
// takes effect without a restart.
export function createCatalogScheduler({
  sync,
  settings,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  now = () => new Date(),
  log = console,
  // Loaded on demand: the triggers bring the notification database along.
  notifyFailure = details => import('../notification-triggers.js').then(module => module.NotificationTriggers.adminSyncFailed(details))
}) {
  let updateTimer = null;
  let fullTimer = null;
  let retryTimer = null;
  let attempts = 0;
  let started = false;
  let nextFullAt = null;
  let nextUpdateAt = null;

  const clear = () => {
    if (updateTimer) timers.clearInterval(updateTimer);
    if (fullTimer) timers.clearTimeout(fullTimer);
    updateTimer = null;
    fullTimer = null;
  };

  // One full run, tried again every FULL_RETRY_MS while an update runs or the
  // run fails; after FULL_RETRY_LIMIT tries the admins get a notification.
  // A request while retries are pending joins them.
  const attemptFull = async () => {
    retryTimer = null;
    attempts += 1;
    const record = await sync.runFull();
    if (!record?.busy && !record?.error) {
      attempts = 0;
      return record;
    }
    const reason = record?.busy ? 'ein Aktualisierungslauf lief noch' : record.error;
    if (attempts >= FULL_RETRY_LIMIT) {
      log.warn(`[CatalogScheduler] full run given up after ${attempts} attempts: ${reason}`);
      const tried = attempts;
      attempts = 0;
      Promise.resolve(notifyFailure({ attempts: tried, reason })).catch(error => log.warn('[CatalogScheduler] admins not notified:', error.message));
      return record;
    }
    log.warn(`[CatalogScheduler] full run not done (${reason}), next try in ${FULL_RETRY_MS / MINUTE} min`);
    retryTimer = timers.setTimeout(attemptFull, FULL_RETRY_MS);
    return record;
  };

  const requestFull = () => {
    if (retryTimer) return Promise.resolve({ type: 'full', busy: true, queued: true, error: null });
    return attemptFull();
  };

  // `generation` changes on every re-arm and stop, so a daily run that is
  // still going when the settings change does not arm a second timer.
  let generation = 0;
  const armFull = (time) => {
    const armedFor = generation;
    const delay = msUntilNextTime(time, now());
    nextFullAt = now().getTime() + delay;
    fullTimer = timers.setTimeout(async () => {
      try {
        await requestFull();
      } catch (error) {
        log.warn('[CatalogScheduler] daily full run failed:', error.message);
      } finally {
        if (started && armedFor === generation) armFull(settings.read().fullSyncTime);
      }
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
    generation += 1;
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
    generation += 1;
    if (retryTimer) timers.clearTimeout(retryTimer);
    retryTimer = null;
    attempts = 0;
    started = false;
  };

  return {
    start,
    stop,
    // The admin's "Vollständig abgleichen": the same retries as the daily run.
    requestFull,
    reload: () => { if (started) arm(); },
    getPlan: () => ({
      started,
      nextUpdateAt,
      nextFullAt,
      fullRetryPending: retryTimer !== null,
      fullAttempts: attempts,
      ...settings.read()
    })
  };
}
