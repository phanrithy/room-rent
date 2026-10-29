import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateToken);

// Financial statements (Admin and Staff)
router.get('/monthly', requireRole('admin', 'staff'), reportController.getMonthlyReport);
router.get('/yearly', requireRole('admin', 'staff'), reportController.getYearlyReport);

// Excel Exports (Admin and Staff)
router.get('/export/invoices', requireRole('admin', 'staff'), reportController.exportInvoices);
router.get('/export/payments', requireRole('admin', 'staff'), reportController.exportPayments);
router.get('/export/monthly', requireRole('admin', 'staff'), reportController.exportMonthlyReport);
router.get('/export/yearly', requireRole('admin', 'staff'), reportController.exportYearlyReport);

export default router;
