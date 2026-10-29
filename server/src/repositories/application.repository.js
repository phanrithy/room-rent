import { getDb } from '../db/connection.js';

export class ApplicationRepository {
  /**
   * Create a new room application
   */
  create({ roomId, tenantId, moveInDate = null, note = null }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO room_applications (room_id, tenant_id, move_in_date, note, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    const info = stmt.run(roomId, tenantId, moveInDate, note);
    return info.lastInsertRowid;
  }

  /**
   * Find application by ID
   */
  findById(id) {
    const db = getDb();
    const row = db.prepare(`
      SELECT a.*,
             r.room_number, r.floor, r.monthly_rent,
             t.name as tenant_name, t.phone as tenant_phone, t.id_number as tenant_id_number,
             t.email as tenant_email, t.telegram_chat_id
      FROM room_applications a
      JOIN rooms r ON a.room_id = r.id
      JOIN tenants t ON a.tenant_id = t.id
      WHERE a.id = ?
    `).get(id);

    return row ? this.mapRow(row) : null;
  }

  /**
   * Find latest application by tenant ID
   */
  findByTenantId(tenantId) {
    const db = getDb();
    const row = db.prepare(`
      SELECT a.*,
             r.room_number, r.floor, r.monthly_rent,
             t.name as tenant_name, t.phone as tenant_phone, t.id_number as tenant_id_number,
             t.email as tenant_email, t.telegram_chat_id
      FROM room_applications a
      JOIN rooms r ON a.room_id = r.id
      JOIN tenants t ON a.tenant_id = t.id
      WHERE a.tenant_id = ?
      ORDER BY a.id DESC
      LIMIT 1
    `).get(tenantId);

    return row ? this.mapRow(row) : null;
  }

  /**
   * Find all pending applications for admin/staff review
   */
  findPending() {
    const db = getDb();
    const rows = db.prepare(`
      SELECT a.*,
             r.room_number, r.floor, r.monthly_rent,
             t.name as tenant_name, t.phone as tenant_phone, t.id_number as tenant_id_number,
             t.email as tenant_email, t.telegram_chat_id,
             (SELECT d.id FROM documents d WHERE d.tenant_id = t.id AND d.kind = 'id_copy' ORDER BY d.id DESC LIMIT 1) as id_document_id,
             (SELECT d.file_name FROM documents d WHERE d.tenant_id = t.id AND d.kind = 'id_copy' ORDER BY d.id DESC LIMIT 1) as id_document_file
      FROM room_applications a
      JOIN rooms r ON a.room_id = r.id
      JOIN tenants t ON a.tenant_id = t.id
      WHERE a.status = 'pending'
      ORDER BY a.id DESC
    `).all();

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Count pending applications
   */
  countPending() {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM room_applications WHERE status = 'pending'`).get();
    return row ? row.count : 0;
  }

  /**
   * Update application status ('approved' or 'rejected')
   */
  updateStatus(id, status) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE room_applications
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(status, id);
    return this.findById(id);
  }

  /**
   * Mark all pending applications for a tenant and room as approved
   */
  approveByTenantAndRoom(tenantId, roomId) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE room_applications
      SET status = 'approved', updated_at = datetime('now')
      WHERE tenant_id = ? AND (room_id = ? OR ? IS NULL) AND status = 'pending'
    `);
    stmt.run(tenantId, roomId, roomId);
  }

  /**
   * Map snake_case database row to camelCase
   */
  mapRow(row) {
    return {
      id: row.id,
      roomId: row.room_id,
      tenantId: row.tenant_id,
      status: row.status,
      moveInDate: row.move_in_date,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roomNumber: row.room_number,
      floor: row.floor,
      monthlyRent: row.monthly_rent,
      tenantName: row.tenant_name,
      tenantPhone: row.tenant_phone,
      tenantIdNumber: row.tenant_id_number,
      tenantEmail: row.tenant_email,
      telegramChatId: row.telegram_chat_id,
      idDocumentId: row.id_document_id || null,
      idDocumentFile: row.id_document_file || null,
    };
  }
}

export const applicationRepository = new ApplicationRepository();
