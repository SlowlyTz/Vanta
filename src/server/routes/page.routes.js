// Serves the SPA shell (index.html) for every path outside /api.
import express from 'express';
import fs from 'fs/promises';
import { INDEX_FILE } from '../config/static.js';
import { BUILD_ID, PAGE_STYLES, injectBuildMeta, injectPageStyles } from '../config/build.js';

const router = express.Router();

// The shell must be revalidated on every load: it names the hashed bundles.
// In production it also carries the build id the page was served with, which
// the client compares with the server's to notice a newer deploy.
// The build is fixed for the process, so the page is put together once.
let page = null;
router.get('*', async (req, res, next) => {
  if (!BUILD_ID) {
    return res.sendFile(INDEX_FILE, { cacheControl: false, headers: { 'Cache-Control': 'no-cache' } });
  }
  try {
    page ??= fs.readFile(INDEX_FILE, 'utf8').then(html => injectPageStyles(injectBuildMeta(html, BUILD_ID), PAGE_STYLES));
    const html = await page.catch(error => {
      page = null;
      throw error;
    });
    res.setHeader('Cache-Control', 'no-cache');
    return res.type('html').send(html);
  } catch (error) {
    return next(error);
  }
});

export default router;
