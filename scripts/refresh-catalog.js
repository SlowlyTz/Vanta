import env from '../src/server/config/env.js';
import { openCatalogDb } from '../src/server/db/catalog.js';
import { createJellyfinCatalogSource } from '../src/server/services/catalog/jellyfin-source.js';
import { createCatalogSync } from '../src/server/services/catalog/sync.service.js';
import { runRefresh } from '../src/server/services/catalog/refresh-cli.js';

// npm run refresh          -> update run (adds new and changed titles)
// npm run refresh -- --full -> full run (also removes vanished titles)
const full = process.argv.includes('--full');

try {
  const record = await runRefresh({
    full,
    port: env.PORT,
    apiKey: env.JELLYFIN_API_KEY,
    runLocal: async ({ full: wantFull }) => {
      // The summary is printed by runRefresh, so the sync itself stays quiet.
      const sync = createCatalogSync({
        db: await openCatalogDb(),
        source: createJellyfinCatalogSource(),
        log: { warn: console.warn, error: console.error }
      });
      return wantFull ? sync.runFull() : sync.runUpdate();
    }
  });

  process.exit(record.error ? 1 : 0);
} catch (error) {
  console.error(`[Catalog] Aktualisierung fehlgeschlagen: ${error.message}`);
  process.exit(1);
}
