import { getDb } from '../db/connection.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { propertyRepository } from '../repositories/property.repository.js';
import { roomRepository } from '../repositories/room.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class ExpenseService {
  /**
   * List expenses with filters
   */
  listExpenses(params) {
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return expenseRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  /**
   * Get single expense by ID
   */
  getExpense(id) {
    const expense = expenseRepository.findById(id);
    if (!expense) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }
    return expense;
  }

  /**
   * Create an expense (in transaction with audit log)
   */
  createExpense(userId, data) {
    const db = getDb();
    let propertyId = data.propertyId;
    if (!propertyId) {
      const defaultProp = propertyRepository.findFirst();
      if (!defaultProp) {
        throw new ValidationError('No property found to associate expense with');
      }
      propertyId = defaultProp.id;
    } else {
      const prop = propertyRepository.findById(propertyId);
      if (!prop) throw new NotFoundError('Property not found', 'PROPERTY_NOT_FOUND');
    }

    if (data.roomId) {
      const room = roomRepository.findById(data.roomId);
      if (!room) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }

    if (typeof data.amount !== 'number' || data.amount < 0) {
      throw new ValidationError('Amount must be a non-negative integer in cents');
    }

    const spentAt = data.spentAt || new Date().toISOString().slice(0, 10);

    return db.transaction(() => {
      const expenseId = expenseRepository.create({
        propertyId,
        roomId: data.roomId || null,
        category: data.category,
        amount: data.amount,
        spentAt,
        note: data.note || null,
      });

      auditRepository.create({
        userId,
        action: 'CREATE_EXPENSE',
        tableName: 'expenses',
        recordId: expenseId,
        detail: {
          category: data.category,
          amount: data.amount,
          roomId: data.roomId || null,
          spentAt,
        },
      });

      return expenseRepository.findById(expenseId);
    })();
  }

  /**
   * Update an expense
   */
  updateExpense(userId, id, data) {
    const db = getDb();
    const existing = expenseRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    if (data.roomId !== undefined && data.roomId !== null) {
      const room = roomRepository.findById(data.roomId);
      if (!room) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }

    if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount < 0)) {
      throw new ValidationError('Amount must be a non-negative integer in cents');
    }

    return db.transaction(() => {
      expenseRepository.update(id, data);

      auditRepository.create({
        userId,
        action: 'UPDATE_EXPENSE',
        tableName: 'expenses',
        recordId: id,
        detail: data,
      });

      return expenseRepository.findById(id);
    })();
  }

  /**
   * Delete an expense
   */
  deleteExpense(userId, id) {
    const db = getDb();
    const existing = expenseRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    return db.transaction(() => {
      expenseRepository.delete(id);

      auditRepository.create({
        userId,
        action: 'DELETE_EXPENSE',
        tableName: 'expenses',
        recordId: id,
        detail: { category: existing.category, amount: existing.amount },
      });

      return { success: true };
    })();
  }

  /**
   * Get category summary and totals for month/year
   */
  getSummary({ month, year } = {}) {
    const categories = expenseRepository.getCategorySummary({ month, year });
    const totalSpent = expenseRepository.getTotalSpent({ month, year });
    return {
      categories,
      totalSpent,
    };
  }
}

export const expenseService = new ExpenseService();
