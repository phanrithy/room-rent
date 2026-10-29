import { expenseService } from '../services/expense.service.js';

export function listExpenses(req, res, next) {
  try {
    const result = expenseService.listExpenses(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getExpense(req, res, next) {
  try {
    const expense = expenseService.getExpense(parseInt(req.params.id, 10));
    res.json({ expense });
  } catch (err) {
    next(err);
  }
}

export function createExpense(req, res, next) {
  try {
    const expense = expenseService.createExpense(req.user.id, req.body);
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
}

export function updateExpense(req, res, next) {
  try {
    const expense = expenseService.updateExpense(
      req.user.id,
      parseInt(req.params.id, 10),
      req.body
    );
    res.json({ expense });
  } catch (err) {
    next(err);
  }
}

export function deleteExpense(req, res, next) {
  try {
    const result = expenseService.deleteExpense(
      req.user.id,
      parseInt(req.params.id, 10)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getExpenseSummary(req, res, next) {
  try {
    const summary = expenseService.getSummary(req.query);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
