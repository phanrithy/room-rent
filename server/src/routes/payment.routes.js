import { Router } from 'express';
import { z } from 'zod';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const addPaymentSchema = z.object({
  invoiceId: z.number().int().positive('Invoice ID is required'),
  amount: z.number().int().positive('Amount must be greater than zero'),
  method: z.enum(['cash', 'bank', 'qr']),
  paidAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

// Admin and staff can list payments
router.get('/', requireRole('admin', 'staff'), paymentController.listPayments);

// Individual receipt (admin, staff, tenant)
router.get('/:id', paymentController.getPayment);
router.get('/:id/pdf', paymentController.getPaymentPdf);

// Record payment (admin, staff)
router.post('/', requireRole('admin', 'staff'), validate(addPaymentSchema), paymentController.addPayment);

export default router;
