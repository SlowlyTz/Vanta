import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PUBLIC_DIR = path.resolve(__dirname, '../../public');
export const DIST_DIR = path.resolve(__dirname, '../../../dist');

// Serving rule: with NODE_ENV=production the Vite build in dist/ (from
// `npm run build`) is served first and src/public only fills in what the build
// does not contain (/vendor, /assets, /js/intro-gate.js). Any other NODE_ENV
// serves src/public as it is, so `npm run dev` needs no build step.
export const SERVE_DIST = env.NODE_ENV === 'production';

if (SERVE_DIST && !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  throw new Error('dist/index.html is missing: run `npm run build` before starting in production.');
}

export const INDEX_FILE = path.join(SERVE_DIST ? DIST_DIR : PUBLIC_DIR, 'index.html');
