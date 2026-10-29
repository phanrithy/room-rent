import { auditRepository } from '../repositories/audit.repository.js';

export function listAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const q = req.query.q || '';
    const tableName = req.query.tableName || '';

    const result = auditRepository.findAndCountAll({ page, pageSize, q, tableName });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
