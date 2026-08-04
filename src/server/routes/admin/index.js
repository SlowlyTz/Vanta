import express from 'express';
import usersRoutes from './users.routes.js';
import settingsRoutes from './settings.routes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);

export default router;
