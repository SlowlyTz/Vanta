import express from 'express';
import path from 'path';
import compression from 'compression';
import { PUBLIC_DIR } from '../config/static.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';
const REVALIDATE = 'no-cache';

// The player build names its chunks `<name>-<8 char hash>.js`; only such
// files may be cached without revalidation. The build entries keep stable
// names (vanta-player.js, vanta-intro.js) and must stay fresh, otherwise a
// cached entry would import chunks a rebuild has removed.
const HASHED_CHUNK = /^vendor\/.*-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;

// The media proxies pipe upstream bodies (images, video, HLS) straight
// through; compressing them would only cost CPU and break range responses.
const PROXY_PREFIXES = ['/api/media/image', '/api/media/stream', '/api/media/playback'];

export function cacheControlFor(relativePath) {
  const file = relativePath.replace(/\\/g, '/');
  if (file === 'index.html') return REVALIDATE;
  if (HASHED_CHUNK.test(file)) return IMMUTABLE;
  if (file.startsWith('assets/')) return ONE_DAY;
  return REVALIDATE;
}

function serveDir(root) {
  return express.static(root, {
    index: false,
    setHeaders(res, filePath) {
      res.setHeader('Cache-Control', cacheControlFor(path.relative(root, filePath)));
    }
  });
}

export const compressResponses = compression({
  filter: (req, res) => !PROXY_PREFIXES.some(prefix => req.path.startsWith(prefix)) && compression.filter(req, res)
});

export const staticAssets = [serveDir(PUBLIC_DIR)];
