import { contractRepository } from '../repositories/contract.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { maintenanceRepository } from '../repositories/maintenance.repository.js';
import { maintenanceService } from '../services/maintenance.service.js';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { applicationRepository } from '../repositories/application.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

export function getTenantDashboard(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenError('User is not associated with a tenant record');
    }

    const tenant = tenantRepository.findById(tenantId);
    const contract = contractRepository.findActiveByTenant(tenantId);
    const pendingApplication = !contract ? applicationRepository.findByTenantId(tenantId) : null;
    const documents = documentRepository.findByTenant(tenantId);

    const invoices = invoiceRepository.findAndCountAll({
      tenantId,
      pageSize: 5,
    });

    const maintenance = maintenanceRepository.findAndCountAll({
      tenantId,
      pageSize: 5,
    });

    const unpaidInvoices = invoiceRepository.findAndCountAll({
      tenantId,
      status: 'unpaid',
      pageSize: 1,
    });
    const currentUnpaid = unpaidInvoices.items[0] || null;

    res.json({
      tenant,
      activeContract: contract,
      pendingApplication,
      documents,
      currentUnpaidInvoice: currentUnpaid,
      recentInvoices: invoices.items,
      recentMaintenance: maintenance.items,
    });
  } catch (err) {
    next(err);
  }
}

export function updateTenantProfile(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenError('Not a tenant');

    const { name, phone, idNumber, email, telegramChatId } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (idNumber !== undefined) updates.idNumber = idNumber ? idNumber.trim() : null;
    if (email !== undefined) updates.email = email ? email.trim() : null;
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId ? telegramChatId.trim() : null;

    tenantRepository.update(tenantId, updates);
    const updated = tenantRepository.findById(tenantId);
    res.json({ tenant: updated, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

export function getTenantContract(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenError('Not a tenant');
    const contract = contractRepository.findActiveByTenant(tenantId);
    res.json({ contract });
  } catch (err) {
    next(err);
  }
}

export function getTenantInvoices(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenError('Not a tenant');
    const result = invoiceRepository.findAndCountAll({
      ...req.query,
      tenantId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getTenantPayments(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenError('Not a tenant');
    const result = paymentRepository.findAndCountAll({
      ...req.query,
      tenantId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getTenantMaintenance(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenError('Not a tenant');
    const result = maintenanceRepository.findAndCountAll({
      ...req.query,
      tenantId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function createTenantMaintenance(req, res, next) {
  try {
    const item = maintenanceService.createRequest(req.user, req.body);
    res.status(201).json({ request: item });
  } catch (err) {
    next(err);
  }
}
