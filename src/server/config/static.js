// What is served: with NODE_ENV=production dist/ (`npm run build`) first, src/public
// only for what the build lacks (/vendor, /assets, /js/intro-gate.js); otherwise
// src/public as it is, so `npm run dev` needs no build step.
import fs from 'fs';
import path from 'path';
import env from './env.js';

import { DIST_DIR, PUBLIC_DIR } from './paths.js';

export { DIST_DIR, PUBLIC_DIR };

export const SERVE_DIST = env.NODE_ENV === 'production';

if (SERVE_DIST && !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  throw new Error('dist/index.html is missing: run `npm run build` before starting in production.');
}

export const INDEX_FILE = path.join(SERVE_DIST ? DIST_DIR : PUBLIC_DIR, 'index.html');
