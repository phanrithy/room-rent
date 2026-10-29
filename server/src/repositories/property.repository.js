import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class PropertyRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Find property by ID
   * @param {number} id
   * @returns {any|null}
   */
  findById(id) {
    const row = this.db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find first (default) property
   * @returns {any|null}
   */
  findFirst() {
    const row = this.db.prepare('SELECT * FROM properties ORDER BY id ASC LIMIT 1').get();
    return row ? keysToCamel(row) : null;
  }

  /**
   * Find all properties
   * @returns {any[]}
   */
  findAll() {
    const rows = this.db.prepare('SELECT * FROM properties ORDER BY id ASC').all();
    return rows.map(keysToCamel);
  }

  /**
   * Create property
   * @param {object} param0
   * @param {string} param0.name
   * @param {string} param0.address
   * @returns {number}
   */
  create({ name, address }) {
    const info = this.db.prepare('INSERT INTO properties (name, address) VALUES (?, ?)').run(name, address);
    return info.lastInsertRowid;
  }

  /**
   * Update property
   * @param {number} id
   * @param {object} param0
   * @param {string} [param0.name]
   * @param {string} [param0.address]
   */
  update(id, { name, address }) {
    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (updates.length === 0) return;
    params.push(id);
    this.db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  /**
   * Delete property
   * @param {number} id
   */
  delete(id) {
    this.db.prepare('DELETE FROM properties WHERE id = ?').run(id);
  }
}

export const propertyRepository = new PropertyRepository();
