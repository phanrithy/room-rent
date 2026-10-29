import { Router } from 'express';
import { z } from 'zod';
import * as maintenanceController from '../controllers/maintenance.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const createMaintenanceSchema = z.object({
  roomId: z.number().int().positive().optional(),
  description: z.string().min(1, 'Description is required'),
  cost: z.number().int().min(0).optional(),
});

const updateMaintenanceSchema = z.object({
  status: z.enum(['open', 'in_progress', 'done']).optional(),
  cost: z.number().int().min(0).optional(),
  description: z.string().min(1).optional(),
  createExpense: z.boolean().optional(),
});

// Admin, Staff, or Tenant can list & view
router.get('/', maintenanceController.listRequests);
router.get('/:id', maintenanceController.getRequest);

// Any authenticated role can submit
router.post('/', validate(createMaintenanceSchema), maintenanceController.createRequest);

// Only admin and staff can update status/cost
router.patch('/:id', requireRole('admin', 'staff'), validate(updateMaintenanceSchema), maintenanceController.updateRequest);

// Only admin can delete
router.delete('/:id', requireRole('admin'), maintenanceController.deleteRequest);

export default router;
