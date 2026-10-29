import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    return res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formatted,
    });
  }

  // Handle SQLite errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'Record with this identifier already exists',
        code: 'ALREADY_EXISTS',
        details: err.message,
      });
    }
    if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
      return res.status(400).json({
        error: 'Database constraint violation',
        code: 'CONSTRAINT_VIOLATION',
        details: err.message,
      });
    }
  }

  // Unhandled errors (do not leak internal details in production)
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
