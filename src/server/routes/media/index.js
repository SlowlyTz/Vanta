import express from 'express';
import libraryRoutes from './library.routes.js';
import imageRoutes from './image.routes.js';
import streamRoutes from './stream.routes.js';
import playbackRoutes from './playback.routes.js';
import peopleRoutes from './people.routes.js';

const router = express.Router();

router.use('/', libraryRoutes);
router.use('/image', imageRoutes);
router.use('/stream', streamRoutes);
router.use('/playback', playbackRoutes);
router.use('/person', peopleRoutes);

export default router;
