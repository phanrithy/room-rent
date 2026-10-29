import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

let dbInstance = null;

/**
 * Get or create database connection
 * @param {string} [customPath]
 * @returns {Database.Database}
 */
export function getDb(customPath = null) {
  if (customPath) {
    const db = new Database(customPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    return db;
  }

  if (!dbInstance) {
    const dbFilePath = path.resolve(process.cwd(), env.DATABASE_PATH);
    const dbDir = path.dirname(dbFilePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new Database(dbFilePath);
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('journal_mode = WAL');
  }

  return dbInstance;
}

/**
 * Set an explicit database instance (e.g. for testing)
 * @param {Database.Database} db
 */
export function setDb(db) {
  dbInstance = db;
}

/**
 * Close database connection
 */
export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
