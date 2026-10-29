import bcrypt from 'bcrypt';
import { roomRepository } from '../repositories/room.repository.js';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class PublicController {
  /**
   * Get available rooms for public leasing / application
   */
  async getAvailableRooms(req, res, next) {
    try {
      const allRooms = roomRepository.findAll();
      const available = allRooms.filter((r) => r.status === 'available');
      res.json({
        rooms: available.map((r) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          floor: r.floor,
          monthlyRent: r.monthlyRent,
          note: r.note,
          status: r.status,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get specific room public details for QR landing page
   */
  async getRoomDetail(req, res, next) {
    try {
      const { identifier } = req.params;
      let room = null;

      // Try numeric ID first
      if (!isNaN(identifier)) {
        room = roomRepository.findById(parseInt(identifier, 10));
      }

      // If not found, try searching by roomNumber
      if (!room) {
        const allRooms = roomRepository.findAll();
        room = allRooms.find((r) => String(r.roomNumber) === String(identifier));
      }

      if (!room) {
        throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
      }

      res.json({
        room: {
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          monthlyRent: room.monthlyRent,
          status: room.status,
          note: room.note,
          propertyName: room.propertyName || 'Sunrise Apartments',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submit new tenant self-application via QR code
   */
  async submitApplication(req, res, next) {
    try {
      const { name, phone, idNumber, roomId, email, telegramChatId, moveInDate } = req.body;

      if (!name || !name.trim()) {
        throw new BadRequestError('Full name is required', 'NAME_REQUIRED');
      }
      if (!phone || !phone.trim()) {
        throw new BadRequestError('Phone number is required', 'PHONE_REQUIRED');
      }
      if (!idNumber || !idNumber.trim()) {
        throw new BadRequestError('National ID or Passport number is required', 'ID_NUMBER_REQUIRED');
      }
      if (!roomId) {
        throw new BadRequestError('Room selection is required', 'ROOM_REQUIRED');
      }

      // Verify room
      let room = roomRepository.findById(parseInt(roomId, 10));
      if (!room) {
        const allRooms = roomRepository.findAll();
        room = allRooms.find((r) => String(r.roomNumber) === String(roomId));
      }
      if (!room) {
        throw new NotFoundError('Selected room was not found', 'ROOM_NOT_FOUND');
      }

      // 1. Find or create tenant record
      const cleanPhone = phone.trim();
      let tenant = tenantRepository.findByPhone(cleanPhone);
      if (!tenant) {
        const tenantId = tenantRepository.create({
          name: name.trim(),
          phone: cleanPhone,
          idNumber: idNumber.trim(),
          email: email ? email.trim() : null,
          telegramChatId: telegramChatId ? telegramChatId.trim() : null,
          language: 'km',
        });
        tenant = tenantRepository.findById(tenantId);
      } else {
        // Update ID number or email if not set
        tenantRepository.update(tenant.id, {
          idNumber: idNumber.trim(),
          email: email ? email.trim() : tenant.email,
          telegramChatId: telegramChatId ? telegramChatId.trim() : tenant.telegramChatId,
        });
        tenant = tenantRepository.findById(tenant.id);
      }

      // 2. Save uploaded National ID / Passport file if provided
      let savedDoc = null;
      if (req.file) {
        const docId = documentRepository.create({
          contractId: null,
          kind: 'id_copy',
          fileName: req.file.filename,
          originalName: req.file.originalname,
        });
        savedDoc = { id: docId, fileName: req.file.filename };
      }

      // 3. Automatically create / link tenant user account for mobile login
      const existingUser = userRepository.findByTenantId(tenant.id);
      let username = cleanPhone;
      let tempPassword = `Rent#${room.roomNumber}`;
      let isNewAccount = false;

      if (!existingUser) {
        const passwordHash = bcrypt.hashSync(tempPassword, 10);
        userRepository.create({
          username,
          passwordHash,
          role: 'tenant',
          tenantId: tenant.id,
          language: 'km',
          theme: 'system',
          active: 1,
        });
        isNewAccount = true;
      } else {
        username = existingUser.username;
      }

      // 4. Audit log
      auditRepository.create({
        userId: null,
        action: 'PUBLIC_TENANT_APPLY',
        tableName: 'tenants',
        recordId: tenant.id,
        detail: {
          name: tenant.name,
          phone: tenant.phone,
          roomId: room.id,
          roomNumber: room.roomNumber,
          hasIdCard: !!req.file,
          isNewAccount,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Rental application submitted successfully!',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          idNumber: tenant.idNumber,
        },
        room: {
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          monthlyRent: room.monthlyRent,
        },
        credentials: {
          username,
          tempPassword: tempPassword || '(Your existing password)',
          isNewAccount,
        },
        document: savedDoc,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const publicController = new PublicController();