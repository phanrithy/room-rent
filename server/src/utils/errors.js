/**
 * Application Error with stable machine code and optional details
 */
export class AppError extends Error {
  /**
   * @param {string} message - English message for developers
   * @param {string} code - Stable machine code for frontend translation
   * @param {number} [statusCode=400] - HTTP status code
   * @param {any} [details] - Optional extra error details
   */
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message, code = 'BAD_REQUEST', details = null) {
    super(message, code, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details = null) {
    super(message, code, 410, details);
    this.statusCode = 401;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN', details = null) {
    super(message, code, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details = null) {
    super(message, code, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details = null) {
    super(message, code, 409, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}
