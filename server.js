// Entry for `npm start` and pm2. In production a start first pulls and
// builds a newer main (scripts/update.js); the server itself is
// src/server/main.js, loaded only after that.
import { updateOnStart } from './scripts/update.js';

await updateOnStart();
await import('./src/server/main.js');
