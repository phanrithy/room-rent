import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class RoomRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * List rooms with filters, search, and pagination
   * @param {object} param0
   * @returns {{ items: any[], total: number }}
   */
  findAndCountAll({ propertyId = null, status = null, floor = null, q = '', page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const params = [];

    if (propertyId) {
      conditions.push('r.property_id = ?');
      params.push(propertyId);
    }
    if (status && status !== 'all') {
      conditions.push('r.status = ?');
      params.push(status);
    }
    if (floor !== null && floor !== undefined && floor !== 'all' && floor !== '') {
      conditions.push('r.floor = ?');
      params.push(parseInt(floor, 10));
    }
    if (q.trim()) {
      conditions.push('(r.room_number LIKE ? OR r.note LIKE ?)');
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM rooms r ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT r.*, p.name as property_name,
        c.id as active_contract_id,
        t.name as tenant_name,
        t.phone as tenant_phone
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.id
      ${whereClause}
      ORDER BY r.floor ASC, r.room_number ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Find all rooms without pagination
   * @param {number|null} [propertyId]
   * @returns {any[]}
   */
  findAll(propertyId = null) {
    const stmt = propertyId
      ? this.db.prepare('SELECT * FROM rooms WHERE property_id = ? ORDER BY floor ASC, room_number ASC')
      : this.db.prepare('SELECT * FROM rooms ORDER BY floor ASC, room_number ASC');
    const rows = propertyId ? stmt.all(propertyId) : stmt.all();
    return rows.map(keysToCamel);
  }

  /**
   * Find room by ID
   * @param {number} id
   * @returns {any|null}
   */
  findById(id) {
    const row = this.db.prepare(`
      SELECT r.*, p.name as property_name,
        c.id as active_contract_id,
        c.rent_amount as contract_rent,
        c.start_date as contract_start_date,
        c.end_date as contract_end_date,
        t.id as tenant_id,
        t.name as tenant_name,
        t.phone as tenant_phone
      FROM rooms r
      JOIN properties p ON r.property_id = p.id
      LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE r.id = ?
    `).get(id);

    return row ? keysToCamel(row) : null;
  }

  /**
   * Find room by number within property
   * @param {number} propertyId
   * @param {string} roomNumber
   * @returns {any|null}
   */
  findByNumber(propertyId, roomNumber) {
    const row = this.db.prepare(`
      SELECT * FROM rooms WHERE property_id = ? AND room_number = ?
    `).get(propertyId, roomNumber);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Create new room
   * @param {object} param0
   * @returns {number}
   */
  create({ propertyId, roomNumber, floor, monthlyRent, status = 'available', note = null }) {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (property_id, room_number, floor, monthly_rent, status, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(propertyId, roomNumber, floor, monthlyRent, status, note);
    return info.lastInsertRowid;
  }

  /**
   * Update room
   * @param {number} id
   * @param {object} updates
   */
  update(id, updates) {
    const fields = [];
    const params = [];

    if (updates.roomNumber !== undefined) {
      fields.push('room_number = ?');
      params.push(updates.roomNumber);
    }
    if (updates.floor !== undefined) {
      fields.push('floor = ?');
      params.push(updates.floor);
    }
    if (updates.monthlyRent !== undefined) {
      fields.push('monthly_rent = ?');
      params.push(updates.monthlyRent);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      params.push(updates.note);
    }

    if (fields.length === 0) return;
    params.push(id);

    this.db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Delete room
   * @param {number} id
   */
  delete(id) {
    this.db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  }

  /**
   * Get distinct floor list for a property
   * @param {number} propertyId
   * @returns {number[]}
   */
  getFloors(propertyId = null) {
    let sql = 'SELECT DISTINCT floor FROM rooms';
    const params = [];
    if (propertyId) {
      sql += ' WHERE property_id = ?';
      params.push(propertyId);
    }
    sql += ' ORDER BY floor ASC';
    const rows = this.db.prepare(sql).all(...params);
    return rows.map((r) => r.floor);
  }
}

export const roomRepository = new RoomRepository();
