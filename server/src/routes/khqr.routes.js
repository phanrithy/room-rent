import { Router } from 'express';
import * as khqrController from '../controllers/khqr.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

// Trigger Bakong check (Admin & Staff)
router.post('/check', requireRole('admin', 'staff'), khqrController.checkBakongTransactions);
router.post('/reminders', requireRole('admin', 'staff'), khqrController.runReminders);

export default router;
