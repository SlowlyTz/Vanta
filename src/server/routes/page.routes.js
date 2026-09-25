import express from 'express';
import fs from 'fs/promises';
import { INDEX_FILE } from '../config/static.js';
import { BUILD_ID, injectBuildMeta } from '../config/build.js';

const router = express.Router();

// The shell must be revalidated on every load: it names the hashed bundles.
// In production it also carries the build id the page was served with, which
// the client compares with the server's to notice a newer deploy.
router.get('*', async (req, res, next) => {
  if (!BUILD_ID) {
    return res.sendFile(INDEX_FILE, { cacheControl: false, headers: { 'Cache-Control': 'no-cache' } });
  }
  try {
    const html = await fs.readFile(INDEX_FILE, 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.type('html').send(injectBuildMeta(html, BUILD_ID));
  } catch (error) {
    return next(error);
  }
});

export default router;
