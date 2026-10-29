import { Router } from 'express';
import { z } from 'zod';
import * as propertyController from '../controllers/property.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().optional().nullable(),
});

// Admin and staff can list properties
router.get('/', requireRole('admin', 'staff'), propertyController.listProperties);

// Admin only actions
router.post('/', requireRole('admin'), validate(propertySchema), propertyController.createProperty);
router.patch('/:id', requireRole('admin'), validate(propertySchema.partial()), propertyController.updateProperty);
router.delete('/:id', requireRole('admin'), propertyController.deleteProperty);

export default router;
