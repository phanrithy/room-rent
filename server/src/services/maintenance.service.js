import { getDb } from '../db/connection.js';
import { maintenanceRepository } from '../repositories/maintenance.repository.js';
import { roomRepository } from '../repositories/room.repository.js';
import { contractRepository } from '../repositories/contract.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { propertyRepository } from '../repositories/property.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export class MaintenanceService {
  listRequests(currentUser, params = {}) {
    if (currentUser.role === 'tenant') {
      return maintenanceRepository.findAndCountAll({
        ...params,
        tenantId: currentUser.tenantId,
      });
    }

    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return maintenanceRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  getRequest(currentUser, id) {
    const item = maintenanceRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Maintenance request not found', 'NOT_FOUND');
    }
    if (currentUser.role === 'tenant' && item.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own maintenance requests');
    }
    return item;
  }

  createRequest(currentUser, data) {
    let roomId = data.roomId;
    let tenantId = null;

    if (currentUser.role === 'tenant') {
      tenantId = currentUser.tenantId;
      // Get tenant's active contract to ensure they report for their own room
      const activeContract = contractRepository.findActiveByTenant(tenantId);
      if (!activeContract) {
        throw new ForbiddenError('You must have an active lease contract to submit a maintenance request');
      }
      roomId = activeContract.roomId;
    } else {
      if (!roomId) {
        throw new ValidationError('Room ID is required');
      }
      const room = roomRepository.findById(roomId);
      if (!room) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
      tenantId = data.tenantId || null;
    }

    const db = getDb();
    return db.transaction(() => {
      const id = maintenanceRepository.create({
        roomId,
        tenantId,
        description: data.description.trim(),
        cost: parseInt(data.cost || '0', 10),
      });

      auditRepository.create({
        userId: currentUser.id,
        action: 'CREATE_MAINTENANCE_REQUEST',
        tableName: 'maintenance_requests',
        recordId: id,
        detail: { roomId, description: data.description },
      });

      return maintenanceRepository.findById(id);
    })();
  }

  updateRequest(currentUser, id, data) {
    const existing = maintenanceRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Maintenance request not found', 'NOT_FOUND');
    }

    const db = getDb();
    return db.transaction(() => {
      const updates = {};
      if (data.status) updates.status = data.status;
      if (data.cost !== undefined) updates.cost = parseInt(data.cost, 10);
      if (data.description) updates.description = data.description.trim();

      maintenanceRepository.update(id, updates);

      // Rule: "A finished maintenance request with a cost can create an expense."
      if (data.status === 'done' && (data.createExpense || data.createExpense === undefined)) {
        const finalCost = data.cost !== undefined ? parseInt(data.cost, 10) : existing.cost;
        if (finalCost > 0) {
          const room = roomRepository.findById(existing.roomId);
          const propertyId = room ? room.propertyId : propertyRepository.findFirst()?.id;

          if (propertyId) {
            expenseRepository.create({
              propertyId,
              roomId: existing.roomId,
              category: 'repair',
              amount: finalCost,
              spentAt: new Date().toISOString().slice(0, 10),
              note: `Maintenance #${id}: ${existing.description.slice(0, 60)}`,
            });
          }
        }
      }

      auditRepository.create({
        userId: currentUser.id,
        action: 'UPDATE_MAINTENANCE_REQUEST',
        tableName: 'maintenance_requests',
        recordId: id,
        detail: updates,
      });

      return maintenanceRepository.findById(id);
    })();
  }

  deleteRequest(currentUser, id) {
    const existing = maintenanceRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Maintenance request not found', 'NOT_FOUND');
    }

    const db = getDb();
    return db.transaction(() => {
      maintenanceRepository.delete(id);
      auditRepository.create({
        userId: currentUser.id,
        action: 'DELETE_MAINTENANCE_REQUEST',
        tableName: 'maintenance_requests',
        recordId: id,
        detail: { description: existing.description },
      });
      return { success: true };
    })();
  }
}

export const maintenanceService = new MaintenanceService();
