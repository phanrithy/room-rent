import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../utils/errors.js';

export function listUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const q = req.query.q || '';
    const result = userRepository.findAndCountAll({ page, pageSize, q });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, password, role, tenantId, language, theme } = req.body;

    const existing = userRepository.findByUsername(username);
    if (existing) {
      throw new ConflictError('Username already taken', 'USERNAME_EXISTS');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = userRepository.create({
      username,
      passwordHash,
      role: role || 'staff',
      tenantId: tenantId || null,
      language: language || 'en',
      theme: theme || 'system',
      active: 1,
    });

    auditRepository.create({
      userId: req.user.id,
      action: 'CREATE_USER',
      tableName: 'users',
      recordId: userId,
      detail: { username, role },
    });

    const user = userRepository.findById(userId);
    delete user.passwordHash;
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const existing = userRepository.findById(targetId);
    if (!existing) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const { role, active, password } = req.body;

    if (active !== undefined) {
      if (targetId === req.user.id && !active) {
        throw new ForbiddenError('You cannot deactivate your own account');
      }
      userRepository.updateActive(targetId, active ? 1 : 0);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      userRepository.updatePassword(targetId, passwordHash);
    }

    auditRepository.create({
      userId: req.user.id,
      action: 'UPDATE_USER',
      tableName: 'users',
      recordId: targetId,
      detail: { role, active },
    });

    const user = userRepository.findById(targetId);
    delete user.passwordHash;
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function deleteUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const existing = userRepository.findById(targetId);
    if (!existing) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    userRepository.delete(targetId);

    auditRepository.create({
      userId: req.user.id,
      action: 'DELETE_USER',
      tableName: 'users',
      recordId: targetId,
      detail: { username: existing.username },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
