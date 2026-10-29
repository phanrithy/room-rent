import { propertyRepository } from '../repositories/property.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { getDb } from '../db/connection.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

export function listProperties(req, res, next) {
  try {
    const items = propertyRepository.findAll();
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export function createProperty(req, res, next) {
  try {
    const { name, address } = req.body;
    const id = propertyRepository.create({ name, address: address || '' });

    auditRepository.create({
      userId: req.user.id,
      action: 'CREATE_PROPERTY',
      tableName: 'properties',
      recordId: id,
      detail: { name, address },
    });

    const property = propertyRepository.findById(id);
    res.status(201).json({ property });
  } catch (err) {
    next(err);
  }
}

export function updateProperty(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = propertyRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Property not found');
    }

    const { name, address } = req.body;
    propertyRepository.update(id, { name, address });

    auditRepository.create({
      userId: req.user.id,
      action: 'UPDATE_PROPERTY',
      tableName: 'properties',
      recordId: id,
      detail: { name, address },
    });

    const property = propertyRepository.findById(id);
    res.json({ property });
  } catch (err) {
    next(err);
  }
}

export function deleteProperty(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getDb();

    // Check if property has rooms
    const count = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE property_id = ?').get(id);
    if (count && count.count > 0) {
      throw new ConflictError(
        'Cannot delete property with existing rooms. Move or delete rooms first.',
        'PROPERTY_HAS_ROOMS'
      );
    }

    propertyRepository.delete(id);

    auditRepository.create({
      userId: req.user.id,
      action: 'DELETE_PROPERTY',
      tableName: 'properties',
      recordId: id,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
