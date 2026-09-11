import express from 'express';
import usersRoutes from './users.routes.js';
import settingsRoutes from './settings.routes.js';
import catalogRoutes from './catalog.routes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/catalog', catalogRoutes);

export default router;
