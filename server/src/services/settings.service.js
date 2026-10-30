import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { invoiceService } from './invoice.service.js';

export class SettingsService {
  /**
   * Get all settings
   * @returns {Record<string, string>}
   */
  getSettings() {
    return settingsRepository.getAll();
  }

  /**
   * Update multiple settings
   * @param {number|null} userId
   * @param {Record<string, any>} updates
   * @returns {Record<string, string>}
   */
  updateSettings(userId, updates) {
    settingsRepository.setMany(updates);

    if (updates.bakong_account_id || updates.merchant_name || updates.merchant_city) {
      try {
        invoiceService.regenerateUnpaidKhqr();
      } catch (err) {
        console.warn('[Settings] Failed to regenerate unpaid KHQRs:', err);
      }
    }

    auditRepository.create({
      userId,
      action: 'UPDATE_SETTINGS',
      tableName: 'settings',
      recordId: null,
      detail: updates,
    });

    return settingsRepository.getAll();
  }
}

export const settingsService = new SettingsService();
