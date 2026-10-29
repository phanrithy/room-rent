import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Verify JWT Bearer token
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header', 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('Invalid authorization token', 'INVALID_TOKEN'));
  }
}

/**
 * Restrict route to specific roles
 * @param  {...string} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action', 'PERMISSION_DENIED'));
    }
    next();
  };
}

/**
 * Rate limiter for sensitive endpoints (e.g. login)
 */
const attemptsMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

export function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = attemptsMap.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + WINDOW_MS;
  }

  entry.count += 1;
  attemptsMap.set(ip, entry);

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: 'Too many login attempts. Please wait a minute before trying again.',
      code: 'TOO_MANY_REQUESTS',
      details: { retryAfterSeconds: retryAfter },
    });
  }

  next();
}
