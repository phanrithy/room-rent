import { Router } from 'express';
import { z } from 'zod';
import * as readingController from '../controllers/reading.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const readingEntrySchema = z.object({
  roomId: z.number().int().positive(),
  electricPrev: z.number().int().min(0),
  electricCurrent: z.number().int().min(0),
  waterPrev: z.number().int().min(0),
  waterCurrent: z.number().int().min(0),
});

const saveReadingsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
  readings: z.array(readingEntrySchema),
});

// Admin and staff can view and enter meter readings
router.get('/sheet', requireRole('admin', 'staff'), readingController.getReadingSheet);
router.post('/save', requireRole('admin', 'staff'), validate(saveReadingsSchema), readingController.saveReadings);

export default router;
