import express from 'express';
import { INDEX_FILE } from '../config/static.js';

const router = express.Router();

// The shell must be revalidated on every load: it names the hashed bundles.
router.get('*', (req, res) => {
  res.sendFile(INDEX_FILE, { cacheControl: false, headers: { 'Cache-Control': 'no-cache' } });
});

export default router;
