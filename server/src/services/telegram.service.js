import { settingsRepository } from '../repositories/settings.repository.js';
import { getDb } from '../db/connection.js';

export class TelegramService {
  constructor() {
    this.cachedBotInfo = null;
    this.cachedBotInfoTime = 0;
  }

  /**
   * Get connected Telegram bot information
   */
  async getBotInfo() {
    if (this.cachedBotInfo && Date.now() - this.cachedBotInfoTime < 30 * 60 * 1000) {
      return this.cachedBotInfo;
    }

    const botToken =
      process.env.TELEGRAM_BOT_TOKEN ||
      settingsRepository.get('telegram_bot_token') ||
      '';

    if (!botToken) return null;

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        this.cachedBotInfo = {
          id: data.result.id,
          firstName: data.result.first_name,
          username: data.result.username,
          link: `https://t.me/${data.result.username}`,
        };
        this.cachedBotInfoTime = Date.now();
        return this.cachedBotInfo;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Helper to normalize a handle for robust comparison (e.g. '@kllllll1201' vs 'klllllll1201')
   */
  normalizeHandle(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/(.)\1+/g, '$1');
  }

  /**
   * Sync Telegram updates to match prospective tenant chat IDs
   */
  async syncBotUpdates() {
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN ||
      settingsRepository.get('telegram_bot_token') ||
      '';
    if (!botToken) return 0;

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-100`);
      const data = await res.json();
      if (!data.ok || !data.result) return 0;

      const db = getDb();
      let matchedCount = 0;

      for (const u of data.result) {
        const msg = u.message;
        if (!msg || !msg.chat) continue;
        const chatId = String(msg.chat.id);
        const username = msg.from?.username ? msg.from.username.replace('@', '').toLowerCase() : null;
        const text = (msg.text || '').trim();

        // 1. Match phone in '/start phone_<number>' or any text containing phone digits
        const phoneMatch = text.match(/phone_([0-9+]+)/i) || text.match(/\b(0\d{7,14}|\+?855\d{7,14})\b/);
        if (phoneMatch) {
          const rawPhone = phoneMatch[1].replace(/\s+/g, '');
          const localPhone = rawPhone.replace(/^\+?855/, '0');
          const intlPhone = `+855${localPhone.replace(/^0/, '')}`;

          const info = db.prepare(`
            UPDATE tenants
            SET telegram_chat_id = ?
            WHERE (phone = ? OR phone = ? OR phone = ?)
              AND (telegram_chat_id IS NULL OR telegram_chat_id != ?)
          `).run(chatId, rawPhone, localPhone, intlPhone, chatId);

          if (info.changes > 0) matchedCount += info.changes;
        }

        // 2. Match username: exact or normalized handle
        if (username) {
          const cleanUsername = username.replace(/^@/, '').toLowerCase();
          const info = db.prepare(`
            UPDATE tenants
            SET telegram_chat_id = ?
            WHERE (
              LOWER(REPLACE(telegram_chat_id, '@', '')) = ?
              OR LOWER(REPLACE(telegram_chat_id, '@', '')) = ?
            )
            AND telegram_chat_id != ?
          `).run(chatId, cleanUsername, `@${cleanUsername}`, chatId);

          if (info.changes > 0) matchedCount += info.changes;

          // Fuzzy handle match for minor typos (e.g. kllllll vs klllllll)
          const allTenantsWithTelegram = db.prepare(`
            SELECT id, telegram_chat_id FROM tenants
            WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id NOT GLOB '[0-9]*'
          `).all();

          for (const t of allTenantsWithTelegram) {
            if (this.normalizeHandle(t.telegram_chat_id) === this.normalizeHandle(username)) {
              db.prepare('UPDATE tenants SET telegram_chat_id = ? WHERE id = ?').run(chatId, t.id);
              matchedCount++;
            }
          }
        }

        // 3. Match room applied: '/start apply_<roomNumber>'
        const roomMatch = text.match(/apply_([a-zA-Z0-9]+)/i);
        if (roomMatch) {
          const roomNum = roomMatch[1];
          const pendingRow = db.prepare(`
            SELECT t.id
            FROM room_applications a
            JOIN rooms r ON a.room_id = r.id
            JOIN tenants t ON a.tenant_id = t.id
            WHERE r.room_number = ? AND a.status = 'pending' AND (t.telegram_chat_id IS NULL OR t.telegram_chat_id != ?)
            ORDER BY a.id DESC LIMIT 1
          `).get(roomNum, chatId);

          if (pendingRow) {
            db.prepare('UPDATE tenants SET telegram_chat_id = ? WHERE id = ?').run(chatId, pendingRow.id);
            matchedCount++;
          }
        }
      }
      return matchedCount;
    } catch (err) {
      console.warn('[Telegram syncBotUpdates error]', err.message);
      return 0;
    }
  }

  /**
   * Resolve a numeric Telegram Chat ID for a tenant
   */
  async resolveTenantChatId(tenant, roomNumber = null) {
    if (!tenant) return null;

    // 1. If already numeric, use directly
    if (tenant.telegramChatId && /^\d+$/.test(String(tenant.telegramChatId).trim())) {
      return String(tenant.telegramChatId).trim();
    }

    // 2. Fetch recent updates from bot to resolve
    await this.syncBotUpdates();

    // 3. Re-check tenant from database
    const db = getDb();
    if (tenant.id) {
      const refreshed = db.prepare('SELECT telegram_chat_id, phone FROM tenants WHERE id = ?').get(tenant.id);
      if (refreshed?.telegram_chat_id && /^\d+$/.test(String(refreshed.telegram_chat_id).trim())) {
        return String(refreshed.telegram_chat_id).trim();
      }
    }

    // 4. Try matching by phone in database
    if (tenant.phone) {
      const cleanPhone = tenant.phone.replace(/\s+/g, '');
      const localPhone = cleanPhone.replace(/^\+?855/, '0');
      const intlPhone = `+855${localPhone.replace(/^0/, '')}`;
      const matched = db.prepare(`
        SELECT telegram_chat_id FROM tenants
        WHERE (phone = ? OR phone = ? OR phone = ?) AND telegram_chat_id GLOB '[0-9]*'
        LIMIT 1
      `).get(cleanPhone, localPhone, intlPhone);

      if (matched?.telegram_chat_id) {
        if (tenant.id) {
          db.prepare('UPDATE tenants SET telegram_chat_id = ? WHERE id = ?').run(matched.telegram_chat_id, tenant.id);
        }
        return String(matched.telegram_chat_id);
      }
    }

    return null;
  }

  /**
   * Send a Telegram message via official Bot API (or simulate if token not configured)
   */
  async sendMessage(chatId, text) {
    if (!chatId) {
      return { success: false, reason: 'CHAT_ID_MISSING' };
    }

    const botToken =
      process.env.TELEGRAM_BOT_TOKEN ||
      settingsRepository.get('telegram_bot_token') ||
      '';

    if (!botToken) {
      console.log(`[Telegram Simulated] Dispatch to ${chatId}:\n${text}`);
      return { success: true, simulated: true };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[Telegram API Error] Status ${res.status}:`, data);
        return { success: false, error: data.description || 'Failed to send Telegram message' };
      }

      return { success: true, messageId: data.result?.message_id };
    } catch (err) {
      console.warn('[Telegram Network Error]', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Alert admin when a prospective tenant scans QR and applies for a room
   */
  async sendAdminApplicationAlert({ room, tenant, moveInDate, documentOriginalName }) {
    const adminChatId =
      process.env.ADMIN_TELEGRAM_CHAT_ID ||
      settingsRepository.get('admin_telegram_chat_id') ||
      '';

    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const rentUsd = (room.monthlyRent / 100).toFixed(2);

    const message = [
      `🔔 <b>NEW ROOM APPLICATION - ${companyName}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏠 <b>Room:</b> #${room.roomNumber} (Floor ${room.floor})`,
      `💵 <b>Monthly Rent:</b> $${rentUsd} / mo`,
      `👤 <b>Applicant:</b> ${tenant.name}`,
      `📱 <b>Phone:</b> ${tenant.phone}`,
      `🪪 <b>ID / Passport:</b> ${tenant.idNumber || 'Not provided'}`,
      `📎 <b>Document / Photo:</b> ${documentOriginalName ? `✅ Attached (${documentOriginalName})` : 'Not uploaded'}`,
      `💬 <b>Applicant Telegram:</b> ${tenant.telegramChatId || 'None'}`,
      `📅 <b>Target Move-in:</b> ${moveInDate || 'Immediate'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👉 <i>Log into Admin Dashboard to review & agree to make a contract.</i>`,
    ].join('\n');

    return this.sendMessage(adminChatId || 'admin_channel', message);
  }

  /**
   * Alert admin when contract is created
   */
  async sendAdminContractCreatedAlert({ room, tenant, deposit, rent, username }) {
    const adminChatId =
      process.env.ADMIN_TELEGRAM_CHAT_ID ||
      settingsRepository.get('admin_telegram_chat_id') ||
      '';
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const rentUsd = (rent / 100).toFixed(2);
    const depUsd = (deposit / 100).toFixed(2);

    const message = [
      `🎉 <b>CONTRACT APPROVED & CREATED - ${companyName}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏠 <b>Room:</b> #${room.roomNumber} (Floor ${room.floor})`,
      `👤 <b>Tenant:</b> ${tenant.name}`,
      `📱 <b>Phone:</b> ${tenant.phone}`,
      `💵 <b>Rent:</b> $${rentUsd} / mo | <b>Deposit:</b> $${depUsd}`,
      `🔑 <b>Tenant Login:</b> <code>${username}</code>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `✅ <i>Room status set to OCCUPIED. Tenant credentials dispatched.</i>`,
    ].join('\n');

    if (adminChatId) {
      return this.sendMessage(adminChatId, message);
    }
    return { success: true };
  }

  /**
   * Send login credentials to tenant when landlord approves/creates the contract
   */
  async sendTenantCredentials({ tenant, room, username, tempPassword, rent = 0, deposit = 0, appUrl = 'http://localhost:5173' }) {
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const loginLink = `${appUrl}/login`;
    const rentUsd = ((rent || room.monthlyRent || 0) / 100).toFixed(2);
    const depUsd = ((deposit || rent || room.monthlyRent || 0) / 100).toFixed(2);

    const message = [
      `🎉 <b>កិច្ចសន្យាត្រូវបានអនុម័ត / CONTRACT APPROVED - ${companyName}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏠 <b>បន្ទប់ (Room):</b> #${room.roomNumber} (ជាន់ទី/Floor ${room.floor || 1})`,
      `👤 <b>អ្នកជួល (Tenant):</b> ${tenant.name}`,
      `📱 <b>លេខទូរស័ព្ទ (Phone):</b> ${tenant.phone}`,
      `💵 <b>ថ្លៃជួល (Rent):</b> $${rentUsd} / mo | <b>ប្រាក់កក់ (Deposit):</b> $${depUsd}`,
      ``,
      `🔑 <b>ព័ត៌មានគណនីចូលប្រព័ន្ធ (Tenant Login Credentials):</b>`,
      `• <b>តំណភ្ជាប់ (Login Portal):</b> ${loginLink}`,
      `• <b>Username:</b> <code>${username}</code>`,
      `• <b>Password:</b> <code>${tempPassword}</code>`,
      ``,
      `📱 <i>លោកអ្នកអាចចូលប្រើប្រាស់ដើម្បី៖</i>`,
      `✓ មើលកិច្ចសន្យាជួលបន្ទប់ (View lease terms)`,
      `✓ បង់ប្រាក់ប្រចាំខែតាម 1-Click Bakong KHQR`,
      `✓ ស្នើសុំជួសជុលសម្ភារៈបន្ទប់ (Maintenance requests)`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `✅ <i>សូមស្វាគមន៍មកកាន់ ${companyName}! Room status set to OCCUPIED.</i>`,
    ].join('\n');

    const chatId = await this.resolveTenantChatId(tenant, room.roomNumber);
    if (chatId) {
      return this.sendMessage(chatId, message);
    }

    return { success: false, reason: 'CHAT_NOT_CONNECTED' };
  }

  /**
   * Notify tenant & admin when application is declined
   */
  async sendApplicationDeclineNotification({ application, tenant, room, reason }) {
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const adminChatId =
      process.env.ADMIN_TELEGRAM_CHAT_ID ||
      settingsRepository.get('admin_telegram_chat_id') ||
      '';

    // 1. Notify Admin Channel
    if (adminChatId) {
      const adminMsg = [
        `❌ <b>APPLICATION DECLINED - ${companyName}</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🏠 <b>Room:</b> #${room.roomNumber} (Floor ${room.floor || 1})`,
        `👤 <b>Applicant:</b> ${tenant.name}`,
        `📱 <b>Phone:</b> ${tenant.phone}`,
        `💬 <b>Telegram:</b> ${tenant.telegramChatId || 'None'}`,
        `📝 <b>Reason:</b> ${reason || 'Room unavailable / criteria not met'}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `ℹ️ <i>Notice recorded by Admin.</i>`,
      ].join('\n');
      await this.sendMessage(adminChatId, adminMsg).catch(() => {});
    }

    // 2. Format Message to Tenant
    const tenantMsg = [
      `📢 <b>សេចក្តីជូនដំណឹងពី ${companyName} / Notice from ${companyName}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `ជំរាបសួរ <b>${tenant.name}</b>,`,
      ``,
      `សូមអរគុណសម្រាប់ការដាក់ពាក្យស្នើសុំជួល <b>បន្ទប់ #${room.roomNumber}</b>។`,
      `ម្ចាស់ផ្ទះបានពិនិត្យពាក្យស្នើសុំរបស់អ្នករួចហើយ ប៉ុន្តែដោយសារ${reason ? ` ${reason}` : 'បន្ទប់ត្រូវបានជួល ឬមិនទាន់ឆ្លើយតបនឹងលក្ខខណ្ឌ'} យើងសោកស្តាយដែលមិនអាចទទួលពាក្យស្នើសុំរបស់អ្នកនៅពេលនេះបានទេ។`,
      ``,
      `យើងខ្ញុំសូមអភ័យទោស និងសូមជូនពរឱ្យអ្នកឆាប់រកបានបន្ទប់ដែលពេញចិត្ត!`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Thank you for applying for Room #${room.roomNumber}. We regret to inform you that your rental application was not approved at this time${reason ? ` (${reason})` : ''}.`,
      `We appreciate your understanding and wish you all the best.`,
    ].join('\n');

    const chatId = await this.resolveTenantChatId(tenant, room.roomNumber);
    if (chatId) {
      return this.sendMessage(chatId, tenantMsg);
    }

    return { success: false, reason: 'CHAT_NOT_CONNECTED' };
  }

  /**
   * Build a shareable approval message and direct Telegram deep link for the landlord
   */
  formatTenantShareMessage({ tenant, room, username, tempPassword, appUrl = 'http://localhost:5173' }) {
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const loginLink = `${appUrl}/login`;

    const plainText = [
      `🎉 Welcome to ${companyName}!`,
      `Your rental contract for Room #${room.roomNumber} is approved.`,
      ``,
      `🔑 Login Credentials:`,
      `• Portal: ${loginLink}`,
      `• Username: ${username}`,
      `• Password: ${tempPassword}`,
      ``,
      `Log in to view your lease, pay rent with Bakong KHQR, and report maintenance issues.`,
    ].join('\n');

    let directTelegramUrl = '';
    if (tenant.telegramChatId) {
      const handle = tenant.telegramChatId.replace('@', '').trim();
      directTelegramUrl = `https://t.me/${handle}?text=${encodeURIComponent(plainText)}`;
    } else if (tenant.phone) {
      const cleanPhone = tenant.phone.trim().replace(/^0/, '+855').replace(/[^0-9+]/g, '');
      directTelegramUrl = `https://t.me/${cleanPhone}?text=${encodeURIComponent(plainText)}`;
    }

    return {
      plainText,
      directTelegramUrl,
    };
  }

  /**
   * Build a shareable decline message and direct Telegram deep link for the landlord
   */
  formatTenantDeclineShareMessage({ tenant, room, reason }) {
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const plainText = [
      `📢 សេចក្តីជូនដំណឹងពី ${companyName}:`,
      `ជំរាបសួរ ${tenant.name},`,
      `សូមអរគុណសម្រាប់ការដាក់ពាក្យស្នើសុំជួល បន្ទប់ #${room.roomNumber}។`,
      `ម្ចាស់ផ្ទះបានពិនិត្យពាក្យស្នើសុំរបស់អ្នករួចហើយ ប៉ុន្តែដោយសារ${reason ? ` ${reason}` : 'បន្ទប់ត្រូវបានជួលរួចហើយ'} យើងសោកស្តាយដែលមិនអាចទទួលពាក្យស្នើសុំរបស់អ្នកនៅពេលនេះបានទេ។`,
      ``,
      `យើងខ្ញុំសូមអភ័យទោស និងសូមជូនពរឱ្យអ្នកឆាប់រកបានបន្ទប់ដែលពេញចិត្ត!`,
    ].join('\n');

    let directTelegramUrl = '';
    if (tenant.telegramChatId) {
      const handle = tenant.telegramChatId.replace('@', '').trim();
      directTelegramUrl = `https://t.me/${handle}?text=${encodeURIComponent(plainText)}`;
    } else if (tenant.phone) {
      const cleanPhone = tenant.phone.trim().replace(/^0/, '+855').replace(/[^0-9+]/g, '');
      directTelegramUrl = `https://t.me/${cleanPhone}?text=${encodeURIComponent(plainText)}`;
    }

    return {
      plainText,
      directTelegramUrl,
    };
  }
}

export const telegramService = new TelegramService();
