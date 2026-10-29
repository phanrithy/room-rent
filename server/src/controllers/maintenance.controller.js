import { maintenanceService } from '../services/maintenance.service.js';

export function listRequests(req, res, next) {
  try {
    const result = maintenanceService.listRequests(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getRequest(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const item = maintenanceService.getRequest(req.user, id);
    res.json({ request: item });
  } catch (err) {
    next(err);
  }
}

export function createRequest(req, res, next) {
  try {
    const item = maintenanceService.createRequest(req.user, req.body);
    res.status(201).json({ request: item });
  } catch (err) {
    next(err);
  }
}

export function updateRequest(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const item = maintenanceService.updateRequest(req.user, id, req.body);
    res.json({ request: item });
  } catch (err) {
    next(err);
  }
}

export function deleteRequest(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = maintenanceService.deleteRequest(req.user, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
