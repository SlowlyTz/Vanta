// Opens and wires the catalogue mirror (database, sync, scheduler, reader) once per process.
import { openCatalogDb } from '../../db/catalog.js';
import { createJellyfinCatalogSource } from './jellyfin-source.js';
import { createCatalogSync } from './sync.service.js';
import { createCatalogSettings } from './settings.js';
import { createCatalogScheduler } from './scheduler.js';
import { createCatalogReader, setActiveCatalogReader } from './reader.js';
import { getImageCache } from '../images/image-cache.js';
import env from '../../config/env.js';

let instance = null;

// Opening the database is async (sql.js loads its wasm); the promise is shared,
// so callers during startup get the same instance.
export function getCatalog() {
  if (!instance) {
    instance = createCatalog();
    instance.catch(() => { instance = null; });
  }
  return instance;
}

async function createCatalog() {
  const db = await openCatalogDb();
  const settings = createCatalogSettings();
  const images = getImageCache();
  const reader = createCatalogReader(db);
  const sync = createCatalogSync({
    db,
    source: createJellyfinCatalogSource(),
    // Pre-renders the card images for the whole catalogue, not only changed titles: existing
    // files cost one stat each, and an emptied cache is warmed here instead of by the first visitor.
    afterRun: async (details) => {
      // Loaded on demand: the notifications bring requests.db with them.
      const [{ NotificationTriggers }, { Housekeeping }] = await Promise.all([
        import('../notification-triggers.js'),
        import('../housekeeping.service.js')
      ]);
      NotificationTriggers.catalogRun(details);
      Housekeeping.run();
      await images.warm(reader.all(), { token: env.JELLYFIN_API_KEY });
    }
  });
  const scheduler = createCatalogScheduler({ sync, settings });
  setActiveCatalogReader(reader);

  return { db, sync, settings, scheduler, reader };
}
