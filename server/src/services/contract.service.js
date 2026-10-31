import bcrypt from 'bcrypt';
import { getDb } from '../db/connection.js';
import { contractRepository } from '../repositories/contract.repository.js';
import { roomRepository } from '../repositories/room.repository.js';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { applicationRepository } from '../repositories/application.repository.js';
import { telegramService } from './telegram.service.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors.js';

export class ContractService {
  /**
   * List contracts
   */
  listContracts(currentUser, params) {
    if (currentUser.role === 'tenant') {
      return contractRepository.findAndCountAll({
        ...params,
        tenantId: currentUser.tenantId,
      });
    }
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return contractRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  /**
   * Get contract detail
   */
  getContract(currentUser, id) {
    const contract = contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract not found', 'CONTRACT_NOT_FOUND');
    }
    if (currentUser.role === 'tenant' && contract.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own contract', 'PERMISSION_DENIED');
    }
    return contract;
  }

  /**
   * Create rental contract
   * Business rule: Room must be available. Room status becomes 'occupied'.
   * Rent amount defaults to room's current rent and is frozen in contract.
   */
  createContract(userId, { roomId, tenantId, startDate, endDate, deposit, rentAmount }) {
    const db = getDb();

    const room = roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    }
    if (room.status !== 'available') {
      throw new ConflictError(
        `Room ${room.roomNumber} is currently ${room.status} and cannot accept a new contract.`,
        'ROOM_NOT_AVAILABLE'
      );
    }

    const tenant = tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    const finalRent = rentAmount !== undefined ? parseInt(rentAmount, 10) : room.monthlyRent;
    const finalDeposit = deposit !== undefined ? parseInt(deposit, 10) : finalRent;

    if (finalRent < 0 || finalDeposit < 0) {
      throw new BadRequestError('Rent and deposit must be greater than or equal to 0', 'INVALID_AMOUNT');
    }

    let createdId;
    let tenantAccount = null;

    const execute = db.transaction(() => {
      createdId = contractRepository.create({
        roomId,
        tenantId,
        startDate,
        endDate,
        deposit: finalDeposit,
        rentAmount: finalRent,
      });

      // Freezing rule & status transition: room becomes occupied
      roomRepository.update(roomId, { status: 'occupied' });

      // Automatically generate a tenant login user account if one doesn't exist yet
      const existingUser = userRepository.findByTenantId(tenantId);
      if (!existingUser) {
        const username = tenant.phone ? tenant.phone.trim() : `tenant_${tenantId}`;
        const defaultPassword = `Rent#${room.roomNumber}`;
        const passwordHash = bcrypt.hashSync(defaultPassword, 10);

        userRepository.create({
          username,
          passwordHash,
          role: 'tenant',
          tenantId,
          language: tenant.language || 'km',
          theme: 'system',
          active: 1,
        });

        tenantAccount = {
          username,
          defaultPassword,
          name: tenant.name,
          phone: tenant.phone,
          roomNumber: room.roomNumber,
          isNew: true,
        };
      } else {
        tenantAccount = {
          username: existingUser.username,
          name: tenant.name,
          phone: tenant.phone,
          roomNumber: room.roomNumber,
          isNew: false,
        };
      }

      // Approve any pending applications for this tenant/room
      applicationRepository.approveByTenantAndRoom(tenantId, roomId);

      // Link any previously uploaded tenant documents (e.g. ID card photo) to this contract
      db.prepare(`
        UPDATE documents
        SET contract_id = ?
        WHERE tenant_id = ? AND contract_id IS NULL
      `).run(createdId, tenantId);

      auditRepository.create({
        userId,
        action: 'CREATE_CONTRACT',
        tableName: 'contracts',
        recordId: createdId,
        detail: {
          roomId,
          roomNumber: room.roomNumber,
          tenantId,
          tenantName: tenant.name,
          deposit: finalDeposit,
          rentAmount: finalRent,
          tenantUsername: tenantAccount.username,
        },
      });
    });

    execute();

    const tempPassword = tenantAccount.defaultPassword || `Rent#${room.roomNumber}`;

    // Automatic Telegram delivery of login credentials to tenant
    telegramService.sendTenantCredentials({
      tenant,
      room,
      username: tenantAccount.username,
      tempPassword,
      deposit: finalDeposit,
      rent: finalRent,
    }).catch((err) => console.warn('[Telegram Dispatch Error]', err.message));

    // Also alert admin Telegram channel of contract creation
    telegramService.sendAdminContractCreatedAlert({
      room,
      tenant,
      deposit: finalDeposit,
      rent: finalRent,
      username: tenantAccount.username,
    }).catch((err) => console.warn('[Telegram Admin Alert Error]', err.message));

    const shareInfo = telegramService.formatTenantShareMessage({
      tenant,
      room,
      username: tenantAccount.username,
      tempPassword,
    });

    const createdContract = contractRepository.findById(createdId);
    return {
      ...createdContract,
      tenantAccount: {
        ...tenantAccount,
        defaultPassword: tempPassword,
        shareText: shareInfo.plainText,
        directTelegramUrl: shareInfo.directTelegramUrl,
      },
    };
  }

  /**
   * Calculate move-out settlement:
   * balance = deposit - unpaid invoices - damage charges
   * refund = max(balance, 0)
   * stillOwed = max(-balance, 0)
   */
  calculateMoveOut(contractId, damageCharges = 0) {
    const contract = contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    const unpaidInvoices = invoiceRepository.findUnpaidByContract(contractId);
    const unpaidInvoicesSum = unpaidInvoices.reduce(
      (sum, inv) => sum + (inv.total - inv.paidAmount),
      0
    );

    const damages = Math.max(0, parseInt(damageCharges || '0', 10));
    const balance = contract.deposit - unpaidInvoicesSum - damages;
    const refund = Math.max(balance, 0);
    const stillOwed = Math.max(-balance, 0);

    return {
      contract,
      deposit: contract.deposit,
      unpaidInvoicesSum,
      unpaidInvoices,
      damageCharges: damages,
      balance,
      refund,
      stillOwed,
    };
  }

  /**
   * End contract and free the room in one transaction
   */
  endContract(userId, contractId, { endedAt = null, damageCharges = 0, note = '' } = {}) {
    const db = getDb();
    const settlement = this.calculateMoveOut(contractId, damageCharges);

    if (settlement.contract.status === 'ended') {
      throw new BadRequestError('Contract has already ended', 'CONTRACT_ALREADY_ENDED');
    }

    const execute = db.transaction(() => {
      // End contract
      contractRepository.endContract(contractId, endedAt);

      // Free the room
      roomRepository.update(settlement.contract.roomId, { status: 'available' });

      // Audit log with complete move-out calculation snapshot
      auditRepository.create({
        userId,
        action: 'END_CONTRACT',
        tableName: 'contracts',
        recordId: contractId,
        detail: {
          roomId: settlement.contract.roomId,
          deposit: settlement.deposit,
          unpaidInvoicesSum: settlement.unpaidInvoicesSum,
          damageCharges: settlement.damageCharges,
          refund: settlement.refund,
          stillOwed: settlement.stillOwed,
          note,
        },
      });
    });

    execute();
    return {
      success: true,
      settlement,
    };
  }
}

export const contractService = new ContractService();
