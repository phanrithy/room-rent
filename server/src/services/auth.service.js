import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * Authentication and User Service
 */
export class AuthService {
  /**
   * Log in user with credentials
   * @param {object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @returns {Promise<{ token: string, user: object }>}
   */
  async login({ username, password }) {
    const user = userRepository.findByUsername(username);
    if (!user) {
      // Use generic error for security
      throw new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    if (!user.active) {
      throw new UnauthorizedError('Account is disabled. Please contact administrator.', 'ACCOUNT_DISABLED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      language: user.language,
      theme: user.theme,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    // Write audit log
    auditRepository.create({
      userId: user.id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.id,
      detail: { username: user.username, role: user.role },
    });

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  /**
   * Get current authenticated user details
   * @param {number} userId
   * @returns {object}
   */
  getCurrentUser(userId) {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Change user password
   * @param {number} userId
   * @param {object} param1
   * @param {string} param1.currentPassword
   * @param {string} param1.newPassword
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long', 'PASSWORD_TOO_SHORT');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    userRepository.updatePassword(userId, newHash);

    auditRepository.create({
      userId,
      action: 'CHANGE_PASSWORD',
      tableName: 'users',
      recordId: userId,
      detail: { username: user.username },
    });

    return { success: true };
  }

  /**
   * Update language and theme preferences
   * @param {number} userId
   * @param {{ language?: string, theme?: string }} preferences
   */
  updatePreferences(userId, { language, theme }) {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    userRepository.updatePreferences(userId, { language, theme });

    auditRepository.create({
      userId,
      action: 'UPDATE_PREFERENCES',
      tableName: 'users',
      recordId: userId,
      detail: { language, theme },
    });

    return this.getCurrentUser(userId);
  }
}

export const authService = new AuthService();
