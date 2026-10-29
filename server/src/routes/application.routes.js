import { Router } from 'express';
import { applicationController } from '../controllers/application.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/pending', (req, res, next) => applicationController.getPendingApplications(req, res, next));
router.post('/:id/reject', (req, res, next) => applicationController.rejectApplication(req, res, next));

export default router;
