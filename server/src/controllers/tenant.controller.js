import { tenantService } from '../services/tenant.service.js';

export function listTenants(req, res, next) {
  try {
    const result = tenantService.listTenants(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getTenant(req, res, next) {
  try {
    const tenant = tenantService.getTenant(req.user, parseInt(req.params.id, 10));
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
}

export function createTenant(req, res, next) {
  try {
    const tenant = tenantService.createTenant(req.user.id, req.body);
    res.status(201).json({ tenant });
  } catch (err) {
    next(err);
  }
}

export function updateTenant(req, res, next) {
  try {
    const tenant = tenantService.updateTenant(req.user.id, parseInt(req.params.id, 10), req.body);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
}

export function deleteTenant(req, res, next) {
  try {
    const result = tenantService.deleteTenant(req.user.id, parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function bulkImportTenants(req, res, next) {
  try {
    const { rows } = req.body;
    const result = tenantService.bulkImport(req.user.id, rows || []);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
