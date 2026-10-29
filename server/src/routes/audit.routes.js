import { Router } from 'express';
import * as auditController from '../controllers/audit.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/', auditController.listAuditLogs);

export default router;
