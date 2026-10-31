import { Router } from 'express';
import { publicController } from '../controllers/public.controller.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes for QR code scan & self-registration (no auth required)
router.get('/rooms', publicController.getAvailableRooms);
router.get('/rooms/:identifier', publicController.getRoomDetail);
router.get('/bot-info', publicController.getPublicBotInfo);
router.post('/apply', upload.single('idCard'), publicController.submitApplication);

export default router;