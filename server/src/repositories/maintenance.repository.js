import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class MaintenanceRepository {
  constructor(db) {
    this.db = db || getDb();
  }

  findById(id) {
    const row = this.db
      .prepare(`
        SELECT m.*, r.room_number, r.floor, t.name as tenant_name, t.phone as tenant_phone
        FROM maintenance_requests m
        JOIN rooms r ON m.room_id = r.id
        LEFT JOIN tenants t ON m.tenant_id = t.id
        WHERE m.id = ?
      `)
      .get(id);
    return row ? keysToCamel(row) : null;
  }

  findAndCountAll({ page = 1, pageSize = 20, status, roomId, tenantId } = {}) {
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('m.status = ?');
      params.push(status);
    }
    if (roomId) {
      conditions.push('m.room_id = ?');
      params.push(parseInt(roomId, 10));
    }
    if (tenantId) {
      conditions.push('m.tenant_id = ?');
      params.push(parseInt(tenantId, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM maintenance_requests m ${whereClause}`)
      .get(...params);
    const total = countRow ? countRow.count : 0;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(`
        SELECT m.*, r.room_number, r.floor, t.name as tenant_name, t.phone as tenant_phone
        FROM maintenance_requests m
        JOIN rooms r ON m.room_id = r.id
        LEFT JOIN tenants t ON m.tenant_id = t.id
        ${whereClause}
        ORDER BY 
          CASE m.status 
            WHEN 'open' THEN 1 
            WHEN 'in_progress' THEN 2 
            WHEN 'done' THEN 3 
          END ASC, 
          m.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total,
      page,
      pageSize,
    };
  }

  create({ roomId, tenantId = null, description, cost = 0 }) {
    const info = this.db
      .prepare(`
        INSERT INTO maintenance_requests (room_id, tenant_id, description, cost)
        VALUES (?, ?, ?, ?)
      `)
      .run(roomId, tenantId, description, cost);
    return info.lastInsertRowid;
  }

  update(id, fields = {}) {
    const sets = [];
    const params = [];

    if (fields.status !== undefined) {
      sets.push('status = ?');
      params.push(fields.status);
      if (fields.status === 'done' && !fields.doneAt) {
        sets.push("done_at = datetime('now')");
      }
    }
    if (fields.cost !== undefined) {
      sets.push('cost = ?');
      params.push(fields.cost);
    }
    if (fields.description !== undefined) {
      sets.push('description = ?');
      params.push(fields.description);
    }
    if (fields.doneAt !== undefined) {
      sets.push('done_at = ?');
      params.push(fields.doneAt);
    }

    if (sets.length === 0) return 0;
    params.push(id);

    const info = this.db
      .prepare(`UPDATE maintenance_requests SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return info.changes;
  }

  delete(id) {
    const info = this.db.prepare('DELETE FROM maintenance_requests WHERE id = ?').run(id);
    return info.changes;
  }
}

export const maintenanceRepository = new MaintenanceRepository();
