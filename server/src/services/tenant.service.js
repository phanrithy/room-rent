import { getDb } from '../db/connection.js';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';

export class TenantService {
  /**
   * List tenants with search and pagination
   */
  listTenants(currentUser, params) {
    if (currentUser.role === 'tenant') {
      throw new ForbiddenError('Tenants cannot list other tenants', 'PERMISSION_DENIED');
    }
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return tenantRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  /**
   * Get tenant detail
   */
  getTenant(currentUser, id) {
    // Tenant ownership check
    if (currentUser.role === 'tenant' && currentUser.tenantId !== id) {
      throw new ForbiddenError('You can only view your own tenant profile', 'PERMISSION_DENIED');
    }

    const tenant = tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    const contracts = tenantRepository.getContracts(id);
    const invoices = tenantRepository.getInvoices(id);

    return {
      ...tenant,
      contracts,
      invoices,
    };
  }

  /**
   * Create new tenant
   */
  createTenant(userId, { name, phone, idNumber, email, telegramChatId, language = 'km' }) {
    const db = getDb();

    if (!name || !name.trim()) {
      throw new BadRequestError('Tenant name is required', 'NAME_REQUIRED');
    }
    if (!phone || !phone.trim()) {
      throw new BadRequestError('Tenant phone is required', 'PHONE_REQUIRED');
    }

    let createdId;
    const execute = db.transaction(() => {
      createdId = tenantRepository.create({
        name: name.trim(),
        phone: phone.trim(),
        idNumber: idNumber ? idNumber.trim() : null,
        email: email ? email.trim() : null,
        telegramChatId: telegramChatId ? telegramChatId.trim() : null,
        language: language || 'km',
      });

      auditRepository.create({
        userId,
        action: 'CREATE_TENANT',
        tableName: 'tenants',
        recordId: createdId,
        detail: { name, phone, idNumber },
      });
    });

    execute();
    return tenantRepository.findById(createdId);
  }

  /**
   * Update tenant
   */
  updateTenant(userId, id, updates) {
    const db = getDb();
    const current = tenantRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    const execute = db.transaction(() => {
      tenantRepository.update(id, updates);
      auditRepository.create({
        userId,
        action: 'UPDATE_TENANT',
        tableName: 'tenants',
        recordId: id,
        detail: updates,
      });
    });

    execute();
    return tenantRepository.findById(id);
  }

  /**
   * Delete tenant
   */
  deleteTenant(userId, id) {
    const db = getDb();
    const current = tenantRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    if (current.activeContractId) {
      throw new ConflictError(
        'Cannot delete tenant with an active rental contract.',
        'TENANT_HAS_ACTIVE_CONTRACT'
      );
    }

    // Check historical contracts
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE tenant_id = ?').get(id);
    if (contractCount && contractCount.count > 0) {
      throw new ConflictError(
        'Cannot delete tenant with existing contract history.',
        'TENANT_HAS_HISTORY'
      );
    }

    const execute = db.transaction(() => {
      tenantRepository.delete(id);
      auditRepository.create({
        userId,
        action: 'DELETE_TENANT',
        tableName: 'tenants',
        recordId: id,
        detail: { name: current.name, phone: current.phone },
      });
    });

    execute();
    return { success: true };
  }

  /**
   * Bulk import tenants from parsed rows
   * @param {number} userId
   * @param {Array<{ name: string, phone: string, idNumber?: string, email?: string }>} rows
   */
  bulkImport(userId, rows) {
    const db = getDb();
    const imported = [];
    const errors = [];

    db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        if (!row.name || String(row.name).trim() === '') {
          errors.push({ row: rowNum, error: 'Tenant name is required' });
          continue;
        }
        if (!row.phone || String(row.phone).trim() === '') {
          errors.push({ row: rowNum, error: 'Phone number is required' });
          continue;
        }

        const name = String(row.name).trim();
        const phone = String(row.phone).trim();
        const idNumber = row.idNumber ? String(row.idNumber).trim() : null;
        const email = row.email ? String(row.email).trim() : null;

        const id = tenantRepository.create({
          name,
          phone,
          idNumber,
          email,
        });

        auditRepository.create({
          userId,
          action: 'BULK_IMPORT_TENANT',
          tableName: 'tenants',
          recordId: id,
          detail: { name, phone },
        });

        imported.push({ id, name, phone });
      }
    })();

    return { imported: imported.length, errors, items: imported };
  }
}

export const tenantService = new TenantService();
