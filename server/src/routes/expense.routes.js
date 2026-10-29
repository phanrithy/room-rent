import { Router } from 'express';
import { z } from 'zod';
import * as expenseController from '../controllers/expense.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();
router.use(authenticateToken);

const createExpenseSchema = z.object({
  propertyId: z.number().int().positive().optional(),
  roomId: z.number().int().positive().optional().nullable(),
  category: z.enum(['repair', 'cleaning', 'utilities', 'other']),
  amount: z.number().int().min(0, 'Amount must be non-negative'),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  note: z.string().optional().nullable(),
});

const updateExpenseSchema = z.object({
  roomId: z.number().int().positive().optional().nullable(),
  category: z.enum(['repair', 'cleaning', 'utilities', 'other']).optional(),
  amount: z.number().int().min(0).optional(),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().optional().nullable(),
});

// Admin and staff can list and view
router.get('/', requireRole('admin', 'staff'), expenseController.listExpenses);
router.get('/summary', requireRole('admin', 'staff'), expenseController.getExpenseSummary);
router.get('/:id', requireRole('admin', 'staff'), expenseController.getExpense);

// Admin and staff can record expenses
router.post('/', requireRole('admin', 'staff'), validate(createExpenseSchema), expenseController.createExpense);

// Only admin can update or delete expenses
router.patch('/:id', requireRole('admin'), validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', requireRole('admin'), expenseController.deleteExpense);

export default router;
