import { getDb } from '../db/connection.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { contractRepository } from '../repositories/contract.repository.js';
import { readingRepository } from '../repositories/reading.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { generateInvoiceKhqr } from '../utils/khqr.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

/**
 * Pure helper to calculate due date (due_day of next month)
 * @param {string} monthStr - 'YYYY-MM'
 * @param {number|string} dueDay
 * @returns {string} 'YYYY-MM-DD'
 */
export function calculateDueDate(monthStr, dueDay = 5) {
  const [yearStr, mStr] = monthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(mStr, 10); // 1-12

  // Next month
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  const day = Math.min(28, Math.max(1, parseInt(dueDay, 10)));
  const yStr = String(year);
  const nextMStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  return `${yStr}-${nextMStr}-${dStr}`;
}

/**
 * Pure helper to calculate invoice costs
 */
export function calculateInvoice({
  rent,
  electricUnits = 0,
  electricPrice = 150,
  waterUnits = 0,
  waterPrice = 50,
  extraCharges = 0,
  lateFee = 0,
}) {
  const eUnits = Math.max(0, parseInt(electricUnits, 10));
  const wUnits = Math.max(0, parseInt(waterUnits, 10));
  const eCost = eUnits * parseInt(electricPrice, 10);
  const wCost = wUnits * parseInt(waterPrice, 10);
  const total =
    parseInt(rent, 10) +
    eCost +
    wCost +
    parseInt(extraCharges, 10) +
    parseInt(lateFee, 10);

  return {
    electricCost: eCost,
    waterCost: wCost,
    total,
  };
}

export class InvoiceService {
  /**
   * List invoices
   */
  listInvoices(currentUser, params) {
    if (currentUser.role === 'tenant') {
      return invoiceRepository.findAndCountAll({
        ...params,
        tenantId: currentUser.tenantId,
      });
    }
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return invoiceRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  /**
   * Get single invoice with full details
   */
  getInvoice(currentUser, id) {
    const invoice = invoiceRepository.findById(id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    }
    if (currentUser.role === 'tenant' && invoice.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own invoice', 'PERMISSION_DENIED');
    }

    const balance = invoice.total - invoice.paidAmount;
    if (balance > 0 && !invoice.khqrString) {
      const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
      const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
      const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');
      const billNumber = `INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`;

      const khqr = generateInvoiceKhqr({
        bakongAccountId,
        merchantName,
        merchantCity,
        amountDollars: balance / 100,
        billNumber,
      });

      if (khqr.qr) {
        invoiceRepository.updateInvoice(invoice.id, {
          khqrString: khqr.qr,
          khqrMd5: khqr.md5,
        });
        invoice.khqrString = khqr.qr;
        invoice.khqrMd5 = khqr.md5;
      }
    }

    return invoice;
  }

  /**
   * Regenerate dynamic KHQR for all unpaid or partial invoices
   */
  regenerateUnpaidKhqr() {
    const db = getDb();
    const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
    const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
    const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');

    const unpaidInvoices = db.prepare(`
      SELECT i.*, r.room_number 
      FROM invoices i
      JOIN contracts c ON i.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      WHERE i.status IN ('unpaid', 'partial', 'overdue')
    `).all();

    for (const inv of unpaidInvoices) {
      const balance = inv.total - inv.paid_amount;
      if (balance > 0) {
        const billNumber = `INV-${inv.month.replace('-', '')}-${inv.room_number}`;
        const khqr = generateInvoiceKhqr({
          bakongAccountId,
          merchantName,
          merchantCity,
          amountDollars: balance / 100,
          billNumber,
        });

        if (khqr.qr) {
          db.prepare('UPDATE invoices SET khqr_string = ?, khqr_md5 = ? WHERE id = ?').run(
            khqr.qr,
            khqr.md5,
            inv.id
          );
        }
      }
    }
  }

  /**
   * Generate invoices for all active contracts for a given month
   */
  generateInvoices(userId, month) {
    const db = getDb();
    const activeContracts = contractRepository.findAllActive();
    const electricPrice = parseInt(settingsRepository.get('electric_price', '150'), 10);
    const waterPrice = parseInt(settingsRepository.get('water_price', '50'), 10);
    const dueDay = parseInt(settingsRepository.get('due_day', '5'), 10);
    const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
    const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
    const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');

    const dueDate = calculateDueDate(month, dueDay);
    const created = [];
    const skipped = [];

    for (const contract of activeContracts) {
      // 1. Check if invoice already exists
      const existing = invoiceRepository.findByContractAndMonth(contract.id, month);
      if (existing) {
        skipped.push({
          contractId: contract.id,
          roomId: contract.roomId,
          roomNumber: contract.roomNumber,
          tenantName: contract.tenantName,
          reason: 'ALREADY_EXISTS',
          invoiceId: existing.id,
        });
        continue;
      }

      // 2. Check if meter reading exists
      const reading = readingRepository.findByRoomAndMonth(contract.roomId, month);
      if (!reading) {
        skipped.push({
          contractId: contract.id,
          roomId: contract.roomId,
          roomNumber: contract.roomNumber,
          tenantName: contract.tenantName,
          reason: 'NO_READING',
        });
        continue;
      }

      // 3. Calculate costs
      const electricUnits = Math.max(0, reading.electricCurrent - reading.electricPrev);
      const waterUnits = Math.max(0, reading.waterCurrent - reading.waterPrev);
      const costs = calculateInvoice({
        rent: contract.rentAmount,
        electricUnits,
        electricPrice,
        waterUnits,
        waterPrice,
      });

      // 4. Generate dynamic KHQR string
      const billNumber = `INV-${month.replace('-', '')}-${contract.roomNumber}`;
      const khqr = generateInvoiceKhqr({
        bakongAccountId,
        merchantName,
        merchantCity,
        amountDollars: costs.total / 100,
        billNumber,
      });

      // 5. Create invoice in transaction
      let invId;
      const execute = db.transaction(() => {
        invId = invoiceRepository.createInvoice({
          contractId: contract.id,
          month,
          rent: contract.rentAmount,
          electricCost: costs.electricCost,
          waterCost: costs.waterCost,
          otherCharges: 0,
          lateFee: 0,
          total: costs.total,
          paidAmount: 0,
          status: 'unpaid',
          dueDate,
          khqrString: khqr.qr,
          khqrMd5: khqr.md5,
        });

        auditRepository.create({
          userId,
          action: 'GENERATE_INVOICE',
          tableName: 'invoices',
          recordId: invId,
          detail: {
            contractId: contract.id,
            month,
            roomNumber: contract.roomNumber,
            total: costs.total,
          },
        });
      });

      execute();
      created.push(invoiceRepository.findById(invId));
    }

    return { created, skipped };
  }

  /**
   * Add extra invoice item/charge
   */
  addExtraCharge(userId, invoiceId, { description, amount }) {
    const db = getDb();
    const invoice = invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const itemAmount = parseInt(amount, 10);
    if (isNaN(itemAmount) || itemAmount === 0) {
      throw new BadRequestError('Charge amount cannot be zero', 'INVALID_AMOUNT');
    }

    const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
    const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
    const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');

    const execute = db.transaction(() => {
      invoiceRepository.addInvoiceItem(invoiceId, description.trim(), itemAmount);

      const items = invoiceRepository.getInvoiceItems(invoiceId);
      const otherCharges = items.reduce((sum, item) => sum + item.amount, 0);
      const newTotal = invoice.rent + invoice.electricCost + invoice.waterCost + otherCharges + invoice.lateFee;

      if (newTotal < invoice.paidAmount) {
        throw new BadRequestError(
          'Total invoice amount cannot be less than the amount already paid',
          'TOTAL_LESS_THAN_PAID'
        );
      }

      // Recalculate status
      const today = new Date().toISOString().split('T')[0];
      let newStatus = 'unpaid';
      if (invoice.paidAmount >= newTotal) {
        newStatus = 'paid';
      } else if (invoice.paidAmount > 0) {
        newStatus = invoice.dueDate < today ? 'overdue' : 'partial';
      } else {
        newStatus = invoice.dueDate < today ? 'overdue' : 'unpaid';
      }

      // Regenerate KHQR for remaining balance
      const balance = newTotal - invoice.paidAmount;
      const billNumber = `INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`;
      const khqr = generateInvoiceKhqr({
        bakongAccountId,
        merchantName,
        merchantCity,
        amountDollars: balance / 100,
        billNumber,
      });

      invoiceRepository.updateInvoice(invoiceId, {
        otherCharges,
        total: newTotal,
        status: newStatus,
        khqrString: khqr.qr,
        khqrMd5: khqr.md5,
      });

      auditRepository.create({
        userId,
        action: 'ADD_EXTRA_CHARGE',
        tableName: 'invoices',
        recordId: invoiceId,
        detail: { description, amount: itemAmount, newTotal },
      });
    });

    execute();
    return invoiceRepository.findById(invoiceId);
  }

  /**
   * Remove extra invoice item
   */
  removeExtraCharge(userId, invoiceId, itemId) {
    const db = getDb();
    const invoice = invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
    const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
    const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');

    const execute = db.transaction(() => {
      invoiceRepository.deleteInvoiceItem(itemId);

      const items = invoiceRepository.getInvoiceItems(invoiceId);
      const otherCharges = items.reduce((sum, item) => sum + item.amount, 0);
      const newTotal = invoice.rent + invoice.electricCost + invoice.waterCost + otherCharges + invoice.lateFee;

      if (newTotal < invoice.paidAmount) {
        throw new BadRequestError(
          'Total invoice amount cannot drop below the amount already paid',
          'TOTAL_LESS_THAN_PAID'
        );
      }

      const today = new Date().toISOString().split('T')[0];
      let newStatus = 'unpaid';
      if (invoice.paidAmount >= newTotal) {
        newStatus = 'paid';
      } else if (invoice.paidAmount > 0) {
        newStatus = invoice.dueDate < today ? 'overdue' : 'partial';
      } else {
        newStatus = invoice.dueDate < today ? 'overdue' : 'unpaid';
      }

      const balance = newTotal - invoice.paidAmount;
      const billNumber = `INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`;
      const khqr = generateInvoiceKhqr({
        bakongAccountId,
        merchantName,
        merchantCity,
        amountDollars: balance / 100,
        billNumber,
      });

      invoiceRepository.updateInvoice(invoiceId, {
        otherCharges,
        total: newTotal,
        status: newStatus,
        khqrString: khqr.qr,
        khqrMd5: khqr.md5,
      });

      auditRepository.create({
        userId,
        action: 'REMOVE_EXTRA_CHARGE',
        tableName: 'invoices',
        recordId: invoiceId,
        detail: { itemId, newTotal },
      });
    });

    execute();
    return invoiceRepository.findById(invoiceId);
  }

  /**
   * Daily job: Check overdue invoices and apply late fee once
   */
  checkOverdue(userId = null) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const candidates = invoiceRepository.findOverdueCandidates(today);
    const lateFeeSetting = parseInt(settingsRepository.get('late_fee', '0'), 10);
    const updatedCount = candidates.length;

    const execute = db.transaction(() => {
      for (const inv of candidates) {
        // Add late fee once if not added before
        let addedLateFee = 0;
        if (inv.lateFee === 0 && lateFeeSetting > 0) {
          addedLateFee = lateFeeSetting;
        }

        const newLateFee = inv.lateFee + addedLateFee;
        const newTotal = inv.total + addedLateFee;

        invoiceRepository.updateInvoice(inv.id, {
          lateFee: newLateFee,
          total: newTotal,
          status: 'overdue',
        });

        auditRepository.create({
          userId,
          action: 'MARK_OVERDUE',
          tableName: 'invoices',
          recordId: inv.id,
          detail: { addedLateFee, newTotal },
        });
      }
    });

    execute();
    return { overdueCount: updatedCount };
  }
}

export const invoiceService = new InvoiceService();
