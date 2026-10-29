import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class InvoiceRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * List invoices with filters and pagination
   */
  findAndCountAll({ month = null, status = null, contractId = null, tenantId = null, q = '', page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const params = [];

    if (month && month !== 'all') {
      conditions.push('i.month = ?');
      params.push(month);
    }
    if (status && status !== 'all') {
      conditions.push('i.status = ?');
      params.push(status);
    }
    if (contractId) {
      conditions.push('i.contract_id = ?');
      params.push(parseInt(contractId, 10));
    }
    if (tenantId) {
      conditions.push('c.tenant_id = ?');
      params.push(parseInt(tenantId, 10));
    }
    if (q.trim()) {
      conditions.push('(r.room_number LIKE ? OR t.name LIKE ? OR t.phone LIKE ?)');
      params.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      ${whereClause}
    `).get(...params);

    const rows = this.db.prepare(`
      SELECT i.*,
        r.room_number, r.floor,
        t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone, t.language as tenant_language,
        (i.total - i.paid_amount) as balance
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      ${whereClause}
      ORDER BY i.month DESC, r.room_number ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return {
      items: rows.map(keysToCamel),
      total: totalRow ? totalRow.count : 0,
    };
  }

  /**
   * Find single invoice with full details, items, and payments
   */
  findById(id) {
    const row = this.db.prepare(`
      SELECT i.*,
        c.room_id, c.start_date as contract_start_date, c.end_date as contract_end_date,
        r.room_number, r.floor, r.property_id,
        p.name as property_name, p.address as property_address,
        t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone,
        t.email as tenant_email, t.telegram_chat_id, t.language as tenant_language,
        (i.total - i.paid_amount) as balance
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN properties p ON r.property_id = p.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE i.id = ?
    `).get(id);

    if (!row) return null;

    const items = this.db.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC
    `).all(id);

    const payments = this.db.prepare(`
      SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, id DESC
    `).all(id);

    return {
      ...keysToCamel(row),
      items: items.map(keysToCamel),
      payments: payments.map(keysToCamel),
    };
  }

  /**
   * Find invoice by contract and month
   */
  findByContractAndMonth(contractId, month) {
    const row = this.db.prepare(`
      SELECT * FROM invoices WHERE contract_id = ? AND month = ?
    `).get(contractId, month);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find unpaid/partial invoices for a contract
   */
  findUnpaidByContract(contractId) {
    const rows = this.db.prepare(`
      SELECT * FROM invoices
      WHERE contract_id = ? AND status IN ('unpaid', 'partial', 'overdue')
      ORDER BY month ASC
    `).all(contractId);
    return rows.map(keysToCamel);
  }

  /**
   * Create invoice
   */
  createInvoice({
    contractId,
    month,
    rent,
    electricCost,
    waterCost,
    otherCharges = 0,
    lateFee = 0,
    total,
    paidAmount = 0,
    status = 'unpaid',
    dueDate,
    khqrString = null,
    khqrMd5 = null,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO invoices (
        contract_id, month, rent, electric_cost, water_cost,
        other_charges, late_fee, total, paid_amount, status,
        due_date, khqr_string, khqr_md5
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      contractId, month, rent, electricCost, waterCost,
      otherCharges, lateFee, total, paidAmount, status,
      dueDate, khqrString, khqrMd5
    );
    return info.lastInsertRowid;
  }

  /**
   * Update invoice fields
   */
  updateInvoice(id, updates) {
    const fields = [];
    const params = [];

    if (updates.otherCharges !== undefined) {
      fields.push('other_charges = ?');
      params.push(updates.otherCharges);
    }
    if (updates.lateFee !== undefined) {
      fields.push('late_fee = ?');
      params.push(updates.lateFee);
    }
    if (updates.total !== undefined) {
      fields.push('total = ?');
      params.push(updates.total);
    }
    if (updates.paidAmount !== undefined) {
      fields.push('paid_amount = ?');
      params.push(updates.paidAmount);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.khqrString !== undefined) {
      fields.push('khqr_string = ?');
      params.push(updates.khqrString);
    }
    if (updates.khqrMd5 !== undefined) {
      fields.push('khqr_md5 = ?');
      params.push(updates.khqrMd5);
    }

    if (fields.length === 0) return;
    params.push(id);

    this.db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Add extra invoice item
   */
  addInvoiceItem(invoiceId, description, amount) {
    const info = this.db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, amount)
      VALUES (?, ?, ?)
    `).run(invoiceId, description, amount);
    return info.lastInsertRowid;
  }

  /**
   * Delete invoice item
   */
  deleteInvoiceItem(itemId) {
    this.db.prepare('DELETE FROM invoice_items WHERE id = ?').run(itemId);
  }

  /**
   * Get invoice items
   */
  getInvoiceItems(invoiceId) {
    const rows = this.db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    return rows.map(keysToCamel);
  }

  /**
   * Find unpaid or partial invoices that are past their due date and have not been marked overdue
   */
  findOverdueCandidates(currentDate) {
    const rows = this.db.prepare(`
      SELECT * FROM invoices
      WHERE status IN ('unpaid', 'partial')
        AND due_date < ?
    `).all(currentDate);
    return rows.map(keysToCamel);
  }
}

export const invoiceRepository = new InvoiceRepository();
