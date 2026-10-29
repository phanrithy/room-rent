import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

// Admin and staff can view dashboard
router.get('/', requireRole('admin', 'staff'), dashboardController.getDashboard);

export default router;
