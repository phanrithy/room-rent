import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

// Admin-only settings management
router.get('/', requireRole('admin'), settingsController.getSettings);
router.patch('/', requireRole('admin'), settingsController.updateSettings);
router.post('/onboarding', requireRole('admin'), settingsController.runOnboarding);

export default router;
