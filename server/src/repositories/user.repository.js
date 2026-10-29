import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class UserRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Find user by username
   * @param {string} username
   * @returns {any|null}
   */
  findByUsername(username) {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find user by ID
   * @param {number} id
   * @returns {any|null}
   */
  findById(id) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Create new user
   * @param {object} param0
   * @returns {number}
   */
  create({ username, passwordHash, role, tenantId = null, language = 'en', theme = 'system', active = 1 }) {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash, role, tenant_id, language, theme, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(username, passwordHash, role, tenantId, language, theme, active);
    return info.lastInsertRowid;
  }

  /**
   * Update user preferences (language, theme)
   * @param {number} id
   * @param {{ language?: string, theme?: string }} preferences
   */
  updatePreferences(id, { language, theme }) {
    const updates = [];
    const params = [];
    if (language) {
      updates.push('language = ?');
      params.push(language);
    }
    if (theme) {
      updates.push('theme = ?');
      params.push(theme);
    }
    if (updates.length === 0) return;
    params.push(id);
    this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Update password hash
   * @param {number} id
   * @param {string} passwordHash
   */
  updatePassword(id, passwordHash) {
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }

  /**
   * List users with pagination
   * @param {object} param0
   * @returns {{ items: any[], total: number }}
   */
  findAndCountAll({ page = 1, pageSize = 20, q = '' }) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params = [];

    if (q.trim()) {
      whereClause = 'WHERE username LIKE ? OR role LIKE ?';
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT id, username, role, tenant_id, language, theme, active, created_at
      FROM users
      ${whereClause}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Update active status
   * @param {number} id
   * @param {number} active 0 or 1
   */
  updateActive(id, active) {
    this.db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  }

  /**
   * Delete user
   * @param {number} id
   */
  delete(id) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

export const userRepository = new UserRepository();
