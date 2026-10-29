import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

// Export invoices and payments to Excel (Admin and Staff)
router.get('/export/invoices', requireRole('admin', 'staff'), reportController.exportInvoices);
router.get('/export/payments', requireRole('admin', 'staff'), reportController.exportPayments);

export default router;
