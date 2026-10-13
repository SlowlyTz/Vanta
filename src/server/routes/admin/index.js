import express from 'express';
import usersRoutes from './users.routes.js';
import settingsRoutes from './settings.routes.js';
import catalogRoutes from './catalog.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/catalog', catalogRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
