import { getDb } from '../db/connection.js';
import { roomRepository } from '../repositories/room.repository.js';
import { propertyRepository } from '../repositories/property.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

export class RoomService {
  /**
   * List rooms with filters and pagination
   */
  listRooms(params) {
    const propertyId = params.propertyId ? parseInt(params.propertyId, 10) : null;
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return roomRepository.findAndCountAll({
      ...params,
      propertyId,
      page,
      pageSize,
    });
  }

  /**
   * Get single room by ID
   */
  getRoom(id) {
    const room = roomRepository.findById(id);
    if (!room) {
      throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }
    return room;
  }

  /**
   * Get available floors
   */
  getFloors(propertyId = null) {
    return roomRepository.getFloors(propertyId);
  }

  /**
   * Create new room
   */
  createRoom(userId, { propertyId, roomNumber, floor, monthlyRent, status = 'available', note = null }) {
    const db = getDb();

    // Verify property
    let propId = propertyId;
    if (!propId) {
      const defaultProp = propertyRepository.findFirst();
      if (!defaultProp) {
        throw new NotFoundError('Property not found', 'PROPERTY_NOT_FOUND');
      }
      propId = defaultProp.id;
    } else {
      const prop = propertyRepository.findById(propId);
      if (!prop) {
        throw new NotFoundError('Property not found', 'PROPERTY_NOT_FOUND');
      }
    }

    // Check unique room number in property
    const existing = roomRepository.findByNumber(propId, roomNumber.trim());
    if (existing) {
      throw new ConflictError(
        `Room ${roomNumber} already exists in this property`,
        'ROOM_EXISTS'
      );
    }

    // Business rule: Users cannot set a room to occupied by hand
    if (status === 'occupied') {
      throw new BadRequestError(
        'Users cannot set a room to occupied manually. Create a rental contract instead.',
        'CANNOT_MANUALLY_OCCUPY'
      );
    }

    if (monthlyRent < 0) {
      throw new BadRequestError('Monthly rent must be greater than or equal to 0', 'INVALID_RENT');
    }

    let createdId;
    const execute = db.transaction(() => {
      createdId = roomRepository.create({
        propertyId: propId,
        roomNumber: roomNumber.trim(),
        floor: parseInt(floor, 10),
        monthlyRent: parseInt(monthlyRent, 10),
        status: status || 'available',
        note,
      });

      auditRepository.create({
        userId,
        action: 'CREATE_ROOM',
        tableName: 'rooms',
        recordId: createdId,
        detail: { propertyId: propId, roomNumber, floor, monthlyRent, status },
      });
    });

    execute();
    return roomRepository.findById(createdId);
  }

  /**
   * Update existing room
   */
  updateRoom(userId, id, updates) {
    const db = getDb();
    const current = roomRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }

    // Business rule: Users cannot set a room to occupied by hand
    if (updates.status === 'occupied' && current.status !== 'occupied') {
      throw new BadRequestError(
        'Users cannot set a room to occupied manually. Create a rental contract instead.',
        'CANNOT_MANUALLY_OCCUPY'
      );
    }

    // If changing away from occupied while active contract exists
    if (current.status === 'occupied' && updates.status && updates.status !== 'occupied') {
      if (current.activeContractId) {
        throw new ConflictError(
          'Cannot change room status while an active contract is in place. End the contract first.',
          'ROOM_HAS_ACTIVE_CONTRACT'
        );
      }
    }

    // Check unique room number if changing number
    if (updates.roomNumber && updates.roomNumber !== current.roomNumber) {
      const existing = roomRepository.findByNumber(current.propertyId, updates.roomNumber.trim());
      if (existing && existing.id !== id) {
        throw new ConflictError(
          `Room ${updates.roomNumber} already exists in this property`,
          'ROOM_EXISTS'
        );
      }
    }

    const execute = db.transaction(() => {
      roomRepository.update(id, updates);
      auditRepository.create({
        userId,
        action: 'UPDATE_ROOM',
        tableName: 'rooms',
        recordId: id,
        detail: updates,
      });
    });

    execute();
    return roomRepository.findById(id);
  }

  /**
   * Delete room
   */
  deleteRoom(userId, id) {
    const db = getDb();
    const current = roomRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }

    if (current.activeContractId) {
      throw new ConflictError(
        'Cannot delete room with an active rental contract.',
        'ROOM_HAS_ACTIVE_CONTRACT'
      );
    }

    // Check if room has historical contracts or readings
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE room_id = ?').get(id);
    if (contractCount && contractCount.count > 0) {
      throw new ConflictError(
        'Cannot delete room with existing rental contract history.',
        'ROOM_HAS_HISTORY'
      );
    }

    const execute = db.transaction(() => {
      roomRepository.delete(id);
      auditRepository.create({
        userId,
        action: 'DELETE_ROOM',
        tableName: 'rooms',
        recordId: id,
        detail: { roomNumber: current.roomNumber },
      });
    });

    execute();
    return { success: true };
  }

  /**
   * Bulk import rooms from parsed rows
   * @param {number} userId
   * @param {Array<{ roomNumber: string, floor?: number, monthlyRent: number, note?: string }>} rows
   */
  bulkImport(userId, rows) {
    const db = getDb();
    const defaultProp = propertyRepository.findFirst();
    if (!defaultProp) throw new NotFoundError('No default property found');
    const propertyId = defaultProp.id;

    const imported = [];
    const errors = [];

    db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        if (!row.roomNumber || String(row.roomNumber).trim() === '') {
          errors.push({ row: rowNum, error: 'Room number is required' });
          continue;
        }

        const roomNumber = String(row.roomNumber).trim();
        const existing = roomRepository.findByNumber(propertyId, roomNumber);
        if (existing) {
          errors.push({ row: rowNum, error: `Room ${roomNumber} already exists` });
          continue;
        }

        const floor = parseInt(row.floor || '1', 10);
        let monthlyRent = parseInt(row.monthlyRent, 10);
        if (isNaN(monthlyRent) || monthlyRent < 0) {
          errors.push({ row: rowNum, error: `Invalid monthly rent for room ${roomNumber}` });
          continue;
        }

        const id = roomRepository.create({
          propertyId,
          roomNumber,
          floor,
          monthlyRent,
          status: 'available',
          note: row.note ? String(row.note).trim() : null,
        });

        auditRepository.create({
          userId,
          action: 'BULK_IMPORT_ROOM',
          tableName: 'rooms',
          recordId: id,
          detail: { roomNumber, floor, monthlyRent },
        });

        imported.push({ id, roomNumber });
      }
    })();

    return { imported: imported.length, errors, items: imported };
  }
}

export const roomService = new RoomService();
