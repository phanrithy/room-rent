import { Router } from 'express';
import { z } from 'zod';
import * as tenantController from '../controllers/tenant.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticateToken);

const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  idNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telegramChatId: z.string().optional().nullable(),
  language: z.enum(['en', 'km']).optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  idNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telegramChatId: z.string().optional().nullable(),
  language: z.enum(['en', 'km']).optional(),
});

// Admin & Staff can list tenants
router.get('/', requireRole('admin', 'staff'), tenantController.listTenants);

// Admin, Staff, or Tenant (own) can view
router.get('/:id', tenantController.getTenant);

// Only admin can create, update, or delete tenants
router.post('/', requireRole('admin'), validate(createTenantSchema), tenantController.createTenant);
router.patch('/:id', requireRole('admin'), validate(updateTenantSchema), tenantController.updateTenant);
router.delete('/:id', requireRole('admin'), tenantController.deleteTenant);

export default router;
