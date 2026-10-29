import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff', 'tenant']),
  tenantId: z.number().int().positive().optional().nullable(),
  language: z.enum(['en', 'km']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

const updateUserSchema = z.object({
  role: z.enum(['admin', 'staff', 'tenant']).optional(),
  active: z.boolean().or(z.number()).optional(),
  password: z.string().min(6).optional(),
});

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
