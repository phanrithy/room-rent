import { Router } from 'express';
import { z } from 'zod';
import * as contractController from '../controllers/contract.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const createContractSchema = z.object({
  roomId: z.number().int().positive('Room ID is required'),
  tenantId: z.number().int().positive('Tenant ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  deposit: z.number().int().min(0).optional(),
  rentAmount: z.number().int().min(0).optional(),
});

const endContractSchema = z.object({
  endedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  damageCharges: z.number().int().min(0).optional(),
  note: z.string().optional().nullable(),
});

// View contracts (admin, staff, tenant)
router.get('/', contractController.listContracts);
router.get('/:id', contractController.getContract);

// Move-out calculation & contract creation (admin only)
router.get('/:id/move-out', requireRole('admin'), contractController.calculateMoveOut);
router.post('/', requireRole('admin'), validate(createContractSchema), contractController.createContract);
router.post('/:id/end', requireRole('admin'), validate(endContractSchema), contractController.endContract);

export default router;
