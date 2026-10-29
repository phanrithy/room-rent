import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import roomRoutes from './room.routes.js';
import tenantRoutes from './tenant.routes.js';
import contractRoutes from './contract.routes.js';
import readingRoutes from './reading.routes.js';
import invoiceRoutes from './invoice.routes.js';
import paymentRoutes from './payment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';
import expenseRoutes from './expense.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/rooms', roomRoutes);
router.use('/tenants', tenantRoutes);
router.use('/contracts', contractRoutes);
router.use('/readings', readingRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);

export default router;
