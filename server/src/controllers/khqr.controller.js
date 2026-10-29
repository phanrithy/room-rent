import { bakongService } from '../services/bakong.service.js';
import { reminderService } from '../services/reminder.service.js';

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
