import express from 'express';
import { BUILD_ID } from '../config/build.js';

const router = express.Router();

// Open to everyone, the login page included: the build id is not a secret and
// a stale client must learn about a deploy before anyone logs in.
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ build: BUILD_ID });
});

export default router;
