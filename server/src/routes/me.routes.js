import { Router } from 'express';
import { z } from 'zod';
import * as meController from '../controllers/me.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);
router.use(requireRole('tenant'));

const maintenanceSchema = z.object({
  description: z.string().min(1, 'Description is required'),
});

const profileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  idNumber: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telegramChatId: z.string().optional().nullable(),
});

router.get('/dashboard', meController.getTenantDashboard);
router.patch('/profile', validate(profileSchema), meController.updateTenantProfile);
router.get('/contract', meController.getTenantContract);
router.get('/invoices', meController.getTenantInvoices);
router.get('/payments', meController.getTenantPayments);
router.get('/maintenance', meController.getTenantMaintenance);
router.post('/maintenance', validate(maintenanceSchema), meController.createTenantMaintenance);

export default router;
