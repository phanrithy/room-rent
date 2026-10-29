import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class ExpenseRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Find expense by ID
   * @param {number} id
   */
  findById(id) {
    const row = this.db
      .prepare(`
        SELECT e.*, r.room_number, p.name as property_name
        FROM expenses e
        JOIN properties p ON e.property_id = p.id
        LEFT JOIN rooms r ON e.room_id = r.id
        WHERE e.id = ?
      `)
      .get(id);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find and count expenses with pagination & filters
   */
  findAndCountAll({
    page = 1,
    pageSize = 20,
    category,
    roomId,
    month,
    from,
    to,
  } = {}) {
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }
    if (roomId) {
      conditions.push('e.room_id = ?');
      params.push(parseInt(roomId, 10));
    }
    if (month) {
      conditions.push('substr(e.spent_at, 1, 7) = ?');
      params.push(month);
    }
    if (from) {
      conditions.push('e.spent_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('e.spent_at <= ?');
      params.push(to);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db
      .prepare(`SELECT COUNT(*) as total FROM expenses e ${whereClause}`)
      .get(...params);
    const total = countRow ? countRow.total : 0;

    const offset = (page - 1) * pageSize;
    const rows = this.db
      .prepare(`
        SELECT e.*, r.room_number, p.name as property_name
        FROM expenses e
        JOIN properties p ON e.property_id = p.id
        LEFT JOIN rooms r ON e.room_id = r.id
        ${whereClause}
        ORDER BY e.spent_at DESC, e.id DESC
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

  /**
   * Create an expense
   */
  create({ propertyId, roomId = null, category, amount, spentAt, note = null }) {
    const info = this.db
      .prepare(`
        INSERT INTO expenses (property_id, room_id, category, amount, spent_at, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(propertyId, roomId, category, amount, spentAt, note);
    return info.lastInsertRowid;
  }

  /**
   * Update an expense
   */
  update(id, fields = {}) {
    const sets = [];
    const params = [];

    if (fields.roomId !== undefined) {
      sets.push('room_id = ?');
      params.push(fields.roomId);
    }
    if (fields.category !== undefined) {
      sets.push('category = ?');
      params.push(fields.category);
    }
    if (fields.amount !== undefined) {
      sets.push('amount = ?');
      params.push(fields.amount);
    }
    if (fields.spentAt !== undefined) {
      sets.push('spent_at = ?');
      params.push(fields.spentAt);
    }
    if (fields.note !== undefined) {
      sets.push('note = ?');
      params.push(fields.note);
    }

    if (sets.length === 0) return 0;
    params.push(id);

    const info = this.db
      .prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return info.changes;
  }

  /**
   * Delete an expense
   */
  delete(id) {
    const info = this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return info.changes;
  }

  /**
   * Get total amount and category breakdown
   */
  getCategorySummary({ month, year } = {}) {
    const conditions = [];
    const params = [];

    if (month) {
      conditions.push('substr(spent_at, 1, 7) = ?');
      params.push(month);
    } else if (year) {
      conditions.push('substr(spent_at, 1, 4) = ?');
      params.push(String(year));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db
      .prepare(`
        SELECT category, SUM(amount) as total_amount, COUNT(*) as count
        FROM expenses
        ${whereClause}
        GROUP BY category
      `)
      .all(...params);

    return rows.map((r) => ({
      category: r.category,
      totalAmount: r.total_amount || 0,
      count: r.count,
    }));
  }

  /**
   * Get total amount spent
   */
  getTotalSpent({ month, year } = {}) {
    const conditions = [];
    const params = [];

    if (month) {
      conditions.push('substr(spent_at, 1, 7) = ?');
      params.push(month);
    } else if (year) {
      conditions.push('substr(spent_at, 1, 4) = ?');
      params.push(String(year));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = this.db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${whereClause}`)
      .get(...params);
    return row ? row.total : 0;
  }
}

export const expenseRepository = new ExpenseRepository();
