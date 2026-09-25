import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PUBLIC_DIR, DIST_DIR, SERVE_DIST } from './static.js';

// Everything a browser runs comes from dist/ and src/public (the Vite build,
// the player, intro and countdown bundles, the service worker). Images and
// fonts do not change behaviour, and hashing them would only cost start time.
const SKIPPED_DIRS = new Set(['assets']);

function listFiles(root, dir = root) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return dir === root && SKIPPED_DIRS.has(entry.name) ? [] : listFiles(root, full);
      }
      return entry.isFile() ? [full] : [];
    });
}

// A content hash of the client code: it only changes when a deploy ships
// something a browser would load differently, so restarting the server or a
// server-only change never asks anyone to reload.
export function computeBuildId(roots) {
  const hash = crypto.createHash('sha256');
  for (const root of roots) {
    for (const file of listFiles(root)) {
      hash.update(path.relative(root, file));
      hash.update('\0');
      hash.update(fs.readFileSync(file));
      hash.update('\0');
    }
  }
  return hash.digest('hex').slice(0, 12);
}

// Only production has a fixed build; in development every file is served
// fresh and there is nothing to compare against.
export const BUILD_ID = SERVE_DIST ? computeBuildId([DIST_DIR, PUBLIC_DIR]) : null;

export const BUILD_HEADER = 'X-Vanta-Build';
export const BUILD_META_NAME = 'vanta-build';

export function injectBuildMeta(html, buildId) {
  if (!buildId) return html;
  return html.replace(/<head>/i, match => `${match}\n  <meta name="${BUILD_META_NAME}" content="${buildId}">`);
}
