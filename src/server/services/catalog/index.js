import { openCatalogDb } from '../../db/catalog.js';
import { createJellyfinCatalogSource } from './jellyfin-source.js';
import { createCatalogSync } from './sync.service.js';
import { createCatalogSettings } from './settings.js';
import { createCatalogScheduler } from './scheduler.js';
import { createCatalogReader, setActiveCatalogReader } from './reader.js';
import { getImageCache } from '../images/image-cache.js';
import env from '../../config/env.js';

let instance = null;

// Wires the catalogue once per process. Opening the database is async (sql.js
// loads its wasm), so everything that needs the catalogue awaits this.
export async function getCatalog() {
  if (instance) return instance;

  const db = await openCatalogDb();
  const settings = createCatalogSettings();
  const images = getImageCache();
  const sync = createCatalogSync({
    db,
    source: createJellyfinCatalogSource(),
    // Pre-renders the card sizes of new and changed titles with the server key.
    afterRun: ({ items }) => images.warm(items, { token: env.JELLYFIN_API_KEY })
  });
  const scheduler = createCatalogScheduler({ sync, settings });
  const reader = createCatalogReader(db);
  setActiveCatalogReader(reader);

  instance = { db, sync, settings, scheduler, reader };
  return instance;
}
