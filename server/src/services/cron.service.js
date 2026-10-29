import cron from 'node-cron';
import { invoiceService } from './invoice.service.js';
import { reminderService } from './reminder.service.js';
import { bakongService } from './bakong.service.js';

export function initCron() {
  // 1. Daily morning job at 08:00: Check overdue, send reminders, check Bakong KHQR
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily morning cycle (08:00 AM)...');
    try {
      const overdue = invoiceService.checkOverdue();
      console.log(`[Cron] Overdue check complete. Updated: ${overdue.updatedCount}`);

      const reminders = await reminderService.sendDailyReminders();
      console.log(`[Cron] Reminders complete. Sent: ${reminders.totalSent}`);

      const bakong = await bakongService.checkUnpaidInvoices();
      console.log(`[Cron] Bakong check complete. Reconciled: ${bakong.paidCount}`);
    } catch (err) {
      console.error('[Cron] Error in daily cycle:', err);
    }
  });

  // 2. Hourly Bakong auto-reconciliation during business hours
  cron.schedule('*/30 7-22 * * *', async () => {
    try {
      await bakongService.checkUnpaidInvoices();
    } catch {
      // Quietly skip per specification
    }
  });

  console.log('[Cron] Automated cron scheduler initialized.');
}
