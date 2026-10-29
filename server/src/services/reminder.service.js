import { getDb } from '../db/connection.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { keysToCamel } from '../utils/case.js';

export class ReminderService {
  /**
   * Run daily automated reminder cycle
   * @param {string} [currentDate] YYYY-MM-DD
   */
  async sendDailyReminders(currentDate = null) {
    const db = getDb();
    const today = currentDate || new Date().toISOString().slice(0, 10);
    const reminderDays = parseInt(settingsRepository.get('reminder_days_before', '3'), 10);
    const companyName = settingsRepository.get('company_name', 'Sunrise Apartments');

    // Calculate target date for before_due (today + X days)
    const targetDateObj = new Date(today);
    targetDateObj.setDate(targetDateObj.getDate() + reminderDays);
    const targetBeforeDueDate = targetDateObj.toISOString().slice(0, 10);

    const sent = [];

    // 1. Before Due Reminders
    const beforeDueInvoices = db
      .prepare(`
        SELECT i.id, i.month, i.due_date, i.total, i.paid_amount,
          r.room_number,
          t.name as tenant_name, t.phone as tenant_phone, t.email as tenant_email, t.telegram_chat_id
        FROM invoices i
        JOIN contracts c ON i.contract_id = c.id
        JOIN rooms r ON c.room_id = r.id
        JOIN tenants t ON c.tenant_id = t.id
        WHERE i.status IN ('unpaid', 'partial')
          AND i.due_date = ?
          AND i.id NOT IN (SELECT invoice_id FROM notifications WHERE type = 'before_due')
      `)
      .all(targetBeforeDueDate);

    for (const inv of beforeDueInvoices) {
      const balance = (inv.total - inv.paid_amount) / 100;
      const channel = inv.telegram_chat_id ? 'telegram' : 'email';
      const msg = `Dear ${inv.tenant_name}, friendly reminder that rent for Room #${inv.room_number} ($${balance.toFixed(2)}) is due on ${inv.due_date}. Thank you, ${companyName}.`;

      const success = await this.deliverMessage({
        channel,
        recipient: inv.telegram_chat_id || inv.tenant_email,
        message: msg,
      });

      if (success) {
        db.prepare(`
          INSERT INTO notifications (invoice_id, type, channel, sent_at)
          VALUES (?, 'before_due', ?, datetime('now'))
        `).run(inv.id, channel);

        sent.push({ invoiceId: inv.id, type: 'before_due', channel, recipient: inv.tenant_name });
      }
    }

    // 2. Overdue Reminders
    const overdueInvoices = db
      .prepare(`
        SELECT i.id, i.month, i.due_date, i.total, i.paid_amount,
          r.room_number,
          t.name as tenant_name, t.phone as tenant_phone, t.email as tenant_email, t.telegram_chat_id
        FROM invoices i
        JOIN contracts c ON i.contract_id = c.id
        JOIN rooms r ON c.room_id = r.id
        JOIN tenants t ON c.tenant_id = t.id
        WHERE (i.status = 'overdue' OR (i.status IN ('unpaid', 'partial') AND i.due_date < ?))
          AND i.id NOT IN (SELECT invoice_id FROM notifications WHERE type = 'overdue')
      `)
      .all(today);

    for (const inv of overdueInvoices) {
      const balance = (inv.total - inv.paid_amount) / 100;
      const channel = inv.telegram_chat_id ? 'telegram' : 'email';
      const msg = `URGENT NOTICE: Rent invoice for Room #${inv.room_number} is past due date (${inv.due_date}). Outstanding balance: $${balance.toFixed(2)}. Please make payment to avoid service interruption. - ${companyName}`;

      const success = await this.deliverMessage({
        channel,
        recipient: inv.telegram_chat_id || inv.tenant_email,
        message: msg,
      });

      if (success) {
        db.prepare(`
          INSERT INTO notifications (invoice_id, type, channel, sent_at)
          VALUES (?, 'overdue', ?, datetime('now'))
        `).run(inv.id, channel);

        sent.push({ invoiceId: inv.id, type: 'overdue', channel, recipient: inv.tenant_name });
      }
    }

    return { totalSent: sent.length, sent };
  }

  /**
   * Deliver notification message via Telegram or Email
   */
  async deliverMessage({ channel, recipient, message }) {
    if (!recipient) {
      // If tenant has no Telegram or email, log dispatch and mark as delivered to prevent re-looping
      return true;
    }

    if (channel === 'telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: recipient,
              text: message,
            }),
          });
          return res.ok;
        } catch {
          return false;
        }
      }
    }

    // Default mock / log delivery
    return true;
  }
}

export const reminderService = new ReminderService();
