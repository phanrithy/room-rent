import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import roomRoutes from './room.routes.js';
import tenantRoutes from './tenant.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/rooms', roomRoutes);
router.use('/tenants', tenantRoutes);

export default router;
