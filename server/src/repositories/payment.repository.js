import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class PaymentRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * List payments with pagination and filters
   */
  findAndCountAll({ invoiceId = null, method = null, page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const params = [];

    if (invoiceId) {
      conditions.push('p.invoice_id = ?');
      params.push(parseInt(invoiceId, 10));
    }
    if (method && method !== 'all') {
      conditions.push('p.method = ?');
      params.push(method);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM payments p ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT p.*,
        i.month, i.total as invoice_total, i.contract_id,
        r.room_number,
        t.id as tenant_id, t.name as tenant_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      ${whereClause}
      ORDER BY p.paid_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Find single payment by ID with receipt details
   */
  findById(id) {
    const row = this.db.prepare(`
      SELECT p.*,
        i.month, i.total as invoice_total, i.due_date,
        c.room_id, c.tenant_id,
        r.room_number, r.floor,
        t.name as tenant_name, t.phone as tenant_phone, t.language as tenant_language,
        prop.name as property_name, prop.address as property_address
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN properties prop ON r.property_id = prop.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE p.id = ?
    `).get(id);

    return row ? keysToCamel(row) : null;
  }

  /**
   * Create payment
   */
  create({ invoiceId, amount, method, paidAt = null, note = null, source = 'manual' }) {
    const timestamp = paidAt || new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO payments (invoice_id, amount, method, paid_at, note, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(invoiceId, amount, method, timestamp, note, source);
    return info.lastInsertRowid;
  }

  /**
   * Get total paid amount for an invoice
   */
  sumByInvoice(invoiceId) {
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments
      WHERE invoice_id = ?
    `).get(invoiceId);
    return row ? row.total_paid : 0;
  }
}

export const paymentRepository = new PaymentRepository();
