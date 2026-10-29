import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { authenticateToken, rateLimitLogin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const preferencesSchema = z.object({
  language: z.enum(['en', 'km']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

router.post('/login', rateLimitLogin, validate(loginSchema), authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.post('/change-password', authenticateToken, validate(changePasswordSchema), authController.changePassword);
router.patch('/preferences', authenticateToken, validate(preferencesSchema), authController.updatePreferences);

export default router;
