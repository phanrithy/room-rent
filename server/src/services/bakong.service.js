import { getDb } from '../db/connection.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { paymentService } from './payment.service.js';
import { settingsRepository } from '../repositories/settings.repository.js';

export class BakongService {
  /**
   * Check single invoice MD5 with Bakong Open API
   * @param {string} md5
   * @returns {Promise<any|null>}
   */
  async checkTransactionByMd5(md5) {
    const rawUrl =
      process.env.BAKONG_BASE_URL ||
      process.env.BAKONG_API_URL ||
      settingsRepository.get('bakong_base_url') ||
      'https://api-bakong.nbc.gov.kh';

    const baseUrl = rawUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    const rawToken =
      process.env.BAKONG_TOKEN ||
      settingsRepository.get('bakong_token') ||
      '';

    if (!rawToken || !rawToken.trim()) {
      // Quietly skip if no token configured
      return null;
    }

    const token = rawToken.trim().startsWith('Bearer ')
      ? rawToken.trim()
      : `Bearer ${rawToken.trim()}`;

    try {
      const res = await fetch(`${baseUrl}/v1/check_transaction_by_md5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ md5 }),
      });

      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data;
    } catch {
      // Quietly skip network/API failure per specification
      return null;
    }
  }

  /**
   * Check all unpaid/partial/overdue invoices with Bakong and auto-record payments
   */
  async checkUnpaidInvoices() {
    const db = getDb();
    const unpaidInvoices = db
      .prepare(`
        SELECT id, total, paid_amount, khqr_md5, month, status
        FROM invoices
        WHERE status IN ('unpaid', 'partial', 'overdue')
          AND khqr_md5 IS NOT NULL
      `)
      .all();

    let checked = 0;
    let paidCount = 0;

    for (const inv of unpaidInvoices) {
      checked++;
      const result = await this.checkTransactionByMd5(inv.khqr_md5);

      // Check if transaction confirmed
      if (result && (result.responseCode === 0 || result.data?.status === 'SUCCESS')) {
        const txAmount = result.data?.amount;
        // Bakong USD amount in floating dollars -> convert to cents
        const amountCents = txAmount
          ? Math.round(parseFloat(txAmount) * 100)
          : (inv.total - inv.paid_amount);

        if (amountCents > 0) {
          try {
            paymentService.addPayment(null, {
              invoiceId: inv.id,
              amount: amountCents,
              method: 'qr',
              source: 'khqr_auto',
              note: `Bakong Auto-Check: TxHash ${result.data?.hash || 'confirmed'}`,
            });
            paidCount++;
          } catch (e) {
            console.error(`Bakong auto-payment failed for invoice ${inv.id}:`, e.message);
          }
        }
      }
    }

    return { checked, paidCount };
  }
}

export const bakongService = new BakongService();
