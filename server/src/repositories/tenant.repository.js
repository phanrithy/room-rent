import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class TenantRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * List tenants with search and pagination
   * @param {object} param0
   * @returns {{ items: any[], total: number }}
   */
  findAndCountAll({ q = '', page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params = [];

    if (q.trim()) {
      whereClause = `WHERE t.name LIKE ? OR t.phone LIKE ? OR t.id_number LIKE ? OR t.email LIKE ?`;
      params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
    }

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM tenants t ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT t.*,
        c.id as active_contract_id,
        c.room_id,
        r.room_number
      FROM tenants t
      LEFT JOIN contracts c ON c.tenant_id = t.id AND c.status = 'active'
      LEFT JOIN rooms r ON c.room_id = r.id
      ${whereClause}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Find tenant by ID
   * @param {number} id
   * @returns {any|null}
   */
  findById(id) {
    const row = this.db.prepare(`
      SELECT t.*,
        c.id as active_contract_id,
        c.room_id,
        r.room_number,
        r.floor as room_floor
      FROM tenants t
      LEFT JOIN contracts c ON c.tenant_id = t.id AND c.status = 'active'
      LEFT JOIN rooms r ON c.room_id = r.id
      WHERE t.id = ?
    `).get(id);

    return row ? keysToCamel(row) : null;
  }

  /**
   * Find tenant by phone number
   * @param {string} phone
   * @returns {any|null}
   */
  findByPhone(phone) {
    const row = this.db.prepare('SELECT * FROM tenants WHERE phone = ?').get(phone);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Create tenant
   * @param {object} param0
   * @returns {number}
   */
  create({ name, phone, idNumber = null, email = null, telegramChatId = null, language = 'km' }) {
    const stmt = this.db.prepare(`
      INSERT INTO tenants (name, phone, id_number, email, telegram_chat_id, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, phone, idNumber, email, telegramChatId, language);
    return info.lastInsertRowid;
  }

  /**
   * Update tenant
   * @param {number} id
   * @param {object} updates
   */
  update(id, updates) {
    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      params.push(updates.phone);
    }
    if (updates.idNumber !== undefined) {
      fields.push('id_number = ?');
      params.push(updates.idNumber);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      params.push(updates.email);
    }
    if (updates.telegramChatId !== undefined) {
      fields.push('telegram_chat_id = ?');
      params.push(updates.telegramChatId);
    }
    if (updates.language !== undefined) {
      fields.push('language = ?');
      params.push(updates.language);
    }

    if (fields.length === 0) return;
    params.push(id);

    this.db.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Delete tenant
   * @param {number} id
   */
  delete(id) {
    this.db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  }

  /**
   * Get rental history/contracts of tenant
   * @param {number} tenantId
   * @returns {any[]}
   */
  getContracts(tenantId) {
    const rows = this.db.prepare(`
      SELECT c.*, r.room_number, r.floor
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      WHERE c.tenant_id = ?
      ORDER BY c.start_date DESC
    `).all(tenantId);
    return rows.map(keysToCamel);
  }

  /**
   * Get invoices of tenant
   * @param {number} tenantId
   * @returns {any[]}
   */
  getInvoices(tenantId) {
    const rows = this.db.prepare(`
      SELECT i.*, r.room_number
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      WHERE c.tenant_id = ?
      ORDER BY i.month DESC
    `).all(tenantId);
    return rows.map(keysToCamel);
  }
}

export const tenantRepository = new TenantRepository();
