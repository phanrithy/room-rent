import { getDb } from '../db/connection.js';

export function getHealth(req, res, next) {
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as ok').get();
    res.json({
      status: 'ok',
      database: result && result.ok === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
