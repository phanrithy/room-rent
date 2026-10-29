import { getDb } from '../db/connection.js';

export class SettingsRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Get all settings as key-value map
   * @returns {Record<string, string>}
   */
  getAll() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  /**
   * Get single setting by key
   * @param {string} key
   * @param {string} [defaultValue='']
   * @returns {string}
   */
  get(key, defaultValue = '') {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  /**
   * Set single setting
   * @param {string} key
   * @param {string|number} value
   */
  set(key, value) {
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value));
  }

  /**
   * Set multiple settings in a transaction
   * @param {Record<string, any>} settingsMap
   */
  setMany(settingsMap) {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    const updateAll = this.db.transaction(() => {
      for (const [k, v] of Object.entries(settingsMap)) {
        stmt.run(k, String(v));
      }
    });
    updateAll();
  }
}

export const settingsRepository = new SettingsRepository();
