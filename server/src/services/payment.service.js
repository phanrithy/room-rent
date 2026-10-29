import { getDb } from '../db/connection.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { generateInvoiceKhqr } from '../utils/khqr.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

export class PaymentService {
  /**
   * List payments
   */
  listPayments(currentUser, params) {
    if (currentUser.role === 'tenant') {
      throw new ForbiddenError('Tenants cannot view global payments list', 'PERMISSION_DENIED');
    }
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20', 10)));
    return paymentRepository.findAndCountAll({
      ...params,
      page,
      pageSize,
    });
  }

  /**
   * Get single payment receipt
   */
  getPayment(currentUser, id) {
    const payment = paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found', 'PAYMENT_NOT_FOUND');
    }
    if (currentUser.role === 'tenant' && payment.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own payment receipt', 'PERMISSION_DENIED');
    }
    return payment;
  }

  /**
   * Record a payment
   */
  addPayment(userId, { invoiceId, amount, method, paidAt = null, note = null, source = 'manual' }) {
    const db = getDb();
    const invoice = invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const payAmount = parseInt(amount, 10);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero', 'INVALID_AMOUNT');
    }

    const currentBalance = invoice.total - invoice.paidAmount;
    if (currentBalance <= 0 || invoice.status === 'paid') {
      throw new BadRequestError('This invoice is already fully paid', 'INVOICE_ALREADY_PAID');
    }

    if (payAmount > currentBalance) {
      throw new BadRequestError(
        `Payment amount ($${(payAmount / 100).toFixed(2)}) cannot exceed remaining balance ($${(currentBalance / 100).toFixed(2)})`,
        'PAYMENT_EXCEEDS_BALANCE',
        { balance: currentBalance, attempted: payAmount }
      );
    }

    const validMethods = ['cash', 'bank', 'qr'];
    if (!validMethods.includes(method)) {
      throw new BadRequestError('Invalid payment method', 'INVALID_METHOD');
    }

    const bakongAccountId = settingsRepository.get('bakong_account_id', 'landlord@devb');
    const merchantName = settingsRepository.get('merchant_name', 'Sunrise Apartments');
    const merchantCity = settingsRepository.get('merchant_city', 'Phnom Penh');

    let paymentId;
    const execute = db.transaction(() => {
      // 1. Insert payment record
      paymentId = paymentRepository.create({
        invoiceId,
        amount: payAmount,
        method,
        paidAt,
        note,
        source,
      });

      // 2. Compute new totals and status
      const newPaid = invoice.paidAmount + payAmount;
      const newBalance = invoice.total - newPaid;
      const today = new Date().toISOString().split('T')[0];

      let newStatus = 'unpaid';
      if (newBalance === 0) {
        newStatus = 'paid';
      } else if (invoice.dueDate < today) {
        newStatus = 'overdue';
      } else {
        newStatus = 'partial';
      }

      // 3. Regenerate dynamic KHQR for the new balance (if balance > 0)
      let nextKhqr = { qr: null, md5: null };
      if (newBalance > 0) {
        const billNumber = `INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`;
        nextKhqr = generateInvoiceKhqr({
          bakongAccountId,
          merchantName,
          merchantCity,
          amountDollars: newBalance / 100,
          billNumber,
        });
      }

      // 4. Update invoice
      invoiceRepository.updateInvoice(invoiceId, {
        paidAmount: newPaid,
        status: newStatus,
        khqrString: nextKhqr.qr,
        khqrMd5: nextKhqr.md5,
      });

      // 5. Audit log
      auditRepository.create({
        userId,
        action: 'ADD_PAYMENT',
        tableName: 'payments',
        recordId: paymentId,
        detail: {
          invoiceId,
          amount: payAmount,
          method,
          source,
          newBalance,
          newStatus,
        },
      });
    });

    execute();
    return {
      payment: paymentRepository.findById(paymentId),
      invoice: invoiceRepository.findById(invoiceId),
    };
  }
}

export const paymentService = new PaymentService();
