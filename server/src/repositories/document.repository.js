import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class DocumentRepository {
  constructor(db) {
    this.db = db || getDb();
  }

  findById(id) {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    return row ? keysToCamel(row) : null;
  }

  findByContract(contractId) {
    const rows = this.db
      .prepare('SELECT * FROM documents WHERE contract_id = ? ORDER BY id DESC')
      .all(contractId);
    return rows.map(keysToCamel);
  }

  create({ contractId, kind, fileName, originalName }) {
    const info = this.db
      .prepare(`
        INSERT INTO documents (contract_id, kind, file_name, original_name)
        VALUES (?, ?, ?, ?)
      `)
      .run(contractId, kind, fileName, originalName);
    return info.lastInsertRowid;
  }

  delete(id) {
    const info = this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return info.changes;
  }
}

export const documentRepository = new DocumentRepository();
