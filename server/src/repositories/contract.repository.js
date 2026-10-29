import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class ContractRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * List contracts with filters and pagination
   */
  findAndCountAll({ status = null, roomId = null, tenantId = null, page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('c.status = ?');
      params.push(status);
    }
    if (roomId) {
      conditions.push('c.room_id = ?');
      params.push(parseInt(roomId, 10));
    }
    if (tenantId) {
      conditions.push('c.tenant_id = ?');
      params.push(parseInt(tenantId, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM contracts c ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT c.*,
        r.room_number, r.floor, r.monthly_rent as current_room_rent,
        t.name as tenant_name, t.phone as tenant_phone, t.email as tenant_email
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      ${whereClause}
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Find contract by ID
   */
  findById(id) {
    const row = this.db.prepare(`
      SELECT c.*,
        r.room_number, r.floor, r.monthly_rent as current_room_rent,
        t.name as tenant_name, t.phone as tenant_phone, t.email as tenant_email
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = ?
    `).get(id);

    return row ? keysToCamel(row) : null;
  }

  /**
   * Find active contract for a room
   */
  findActiveByRoomId(roomId) {
    const row = this.db.prepare(`
      SELECT * FROM contracts WHERE room_id = ? AND status = 'active'
    `).get(roomId);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find active contract for a tenant
   */
  findActiveByTenant(tenantId) {
    const row = this.db.prepare(`
      SELECT c.*, r.room_number, r.floor
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      WHERE c.tenant_id = ? AND c.status = 'active'
    `).get(tenantId);
    return row ? keysToCamel(row) : null;
  }

  /**
   * List all active contracts
   */
  findAllActive() {
    const rows = this.db.prepare(`
      SELECT c.*, r.room_number, r.floor, t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.status = 'active'
      ORDER BY r.room_number ASC
    `).all();
    return rows.map(keysToCamel);
  }

  /**
   * Create contract
   */
  create({ roomId, tenantId, startDate, endDate, deposit, rentAmount }) {
    const stmt = this.db.prepare(`
      INSERT INTO contracts (room_id, tenant_id, start_date, end_date, deposit, rent_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `);
    const info = stmt.run(roomId, tenantId, startDate, endDate, deposit, rentAmount);
    return info.lastInsertRowid;
  }

  /**
   * End contract
   */
  endContract(id, endedAt = null) {
    const timestamp = endedAt || new Date().toISOString().split('T')[0];
    this.db.prepare(`
      UPDATE contracts SET status = 'ended', ended_at = ? WHERE id = ?
    `).run(timestamp, id);
  }
}

export const contractRepository = new ContractRepository();
