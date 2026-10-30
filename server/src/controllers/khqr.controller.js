import { bakongService } from '../services/bakong.service.js';
import { reminderService } from '../services/reminder.service.js';
import { generateInvoiceKhqr } from '../utils/khqr.js';
import { settingsRepository } from '../repositories/settings.repository.js';

export async function checkBakongTransactions(req, res, next) {
  try {
    const result = await bakongService.checkUnpaidInvoices();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function runReminders(req, res, next) {
  try {
    const result = await reminderService.sendDailyReminders(req.body.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function previewKhqr(req, res, next) {
  try {
    const { bakongAccountId, merchantName, merchantCity, amountDollars } = req.body || {};
    const khqr = generateInvoiceKhqr({
      bakongAccountId: bakongAccountId || settingsRepository.get('bakong_account_id', 'landlord@devb'),
      merchantName: merchantName || settingsRepository.get('merchant_name', 'Sunrise Apartments'),
      merchantCity: merchantCity || settingsRepository.get('merchant_city', 'Phnom Penh'),
      amountDollars: amountDollars || 1.0,
      billNumber: 'PREVIEW-TEST',
    });
    res.json(khqr);
  } catch (err) {
    next(err);
  }
}
