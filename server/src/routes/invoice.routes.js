import { Router } from 'express';
import { z } from 'zod';
import * as invoiceController from '../controllers/invoice.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const generateInvoicesSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
});

const addChargeSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().int(),
});

// List and view invoices
router.get('/', invoiceController.listInvoices);
router.get('/:id', invoiceController.getInvoice);

// Admin and staff actions
router.post('/generate', requireRole('admin', 'staff'), validate(generateInvoicesSchema), invoiceController.generateInvoices);
router.post('/check-overdue', requireRole('admin', 'staff'), invoiceController.checkOverdue);
router.post('/:id/charges', requireRole('admin', 'staff'), validate(addChargeSchema), invoiceController.addExtraCharge);
router.delete('/:id/charges/:itemId', requireRole('admin', 'staff'), invoiceController.removeExtraCharge);

export default router;
