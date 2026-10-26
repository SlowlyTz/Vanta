// Build id and app version (/api/version). Open to everyone, the login page
// included: the id is no secret and a stale client must learn of a deploy early.
import express from 'express';
import { BUILD_ID } from '../config/build.js';
import { APP_VERSION } from '../../public/js/shared/version.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ build: BUILD_ID, version: APP_VERSION });
});

export default router;
