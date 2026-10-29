import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class AuditRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Insert audit log entry
   * @param {object} param0
   * @param {number|null} param0.userId
   * @param {string} param0.action
   * @param {string} param0.tableName
   * @param {number|null} param0.recordId
   * @param {any} [param0.detail]
   * @returns {number} inserted log id
   */
  create({ userId = null, action, tableName, recordId = null, detail = null }) {
    const detailJson = detail ? JSON.stringify(detail) : null;
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, detail)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, action, tableName, recordId, detailJson);
    return info.lastInsertRowid;
  }

  /**
   * List audit logs with pagination
   * @param {object} param0
   * @param {number} param0.page
   * @param {number} param0.pageSize
   * @param {string} [param0.q]
   * @returns {{ items: any[], total: number }}
   */
  findAndCountAll({ page = 1, pageSize = 20, q = '' }) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params = [];

    if (q.trim()) {
      whereClause = `WHERE action LIKE ? OR table_name LIKE ?`;
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT a.*, u.username
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map((r) => {
        const item = keysToCamel(r);
        if (item.detail) {
          try {
            item.detail = JSON.parse(item.detail);
          } catch {
            // ignore
          }
        }
        return item;
      }),
      total: totalRow ? totalRow.count : 0,
    };
  }
}

export const auditRepository = new AuditRepository();
