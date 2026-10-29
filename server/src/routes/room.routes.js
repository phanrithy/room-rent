import { Router } from 'express';
import { z } from 'zod';
import * as roomController from '../controllers/room.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// All room routes require authentication
router.use(authenticateToken);

const createRoomSchema = z.object({
  propertyId: z.number().int().positive().optional(),
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number().int(),
  monthlyRent: z.number().int().min(0, 'Monthly rent must be >= 0'),
  status: z.enum(['available', 'maintenance']).optional(),
  note: z.string().optional().nullable(),
});

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  floor: z.number().int().optional(),
  monthlyRent: z.number().int().min(0).optional(),
  status: z.enum(['available', 'maintenance', 'occupied']).optional(),
  note: z.string().optional().nullable(),
});

// Admin and staff can view rooms
router.get('/', requireRole('admin', 'staff'), roomController.listRooms);
router.get('/floors', requireRole('admin', 'staff'), roomController.getFloors);
router.get('/:id', requireRole('admin', 'staff'), roomController.getRoom);

// Only admin can create, update, or delete rooms
router.post('/', requireRole('admin'), validate(createRoomSchema), roomController.createRoom);
router.patch('/:id', requireRole('admin'), validate(updateRoomSchema), roomController.updateRoom);
router.delete('/:id', requireRole('admin'), roomController.deleteRoom);

export default router;
