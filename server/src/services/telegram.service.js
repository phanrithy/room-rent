import { settingsRepository } from '../repositories/settings.repository.js';

export class TelegramService {
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

    // Deliver to admin if chat ID is configured (or log simulated)
    return this.sendMessage(adminChatId || 'admin_channel', message);
  }

  /**
   * Send login credentials to tenant when landlord approves/creates the contract
   */
  async sendTenantCredentials({ tenant, room, username, tempPassword, appUrl = 'http://localhost:5173' }) {
    const companyName = settingsRepository.get('company_name') || 'Sunrise Apartments';
    const loginLink = `${appUrl}/login`;

    const message = [
      `🎉 <b>WELCOME TO ${companyName.toUpperCase()}!</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Your room rental agreement for <b>Room #${room.roomNumber}</b> is approved!`,
      ``,
      `🔑 <b>Your Login Credentials:</b>`,
      `• <b>Login Portal:</b> ${loginLink}`,
      `• <b>Username:</b> <code>${username}</code> (or your phone number)`,
      `• <b>Password:</b> <code>${tempPassword}</code>`,
      ``,
      `📱 <i>You can now log in anytime to:</i>`,
      `✓ View your room agreement & lease terms`,
      `✓ Pay monthly bills with 1-click Bakong KHQR`,
      `✓ Submit maintenance requests for your room`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💡 <i>You can change your password anytime after logging in.</i>`,
    ].join('\n');

    const targetRecipient = tenant.telegramChatId || tenant.phone;
    return this.sendMessage(targetRecipient, message);
  }

  /**
   * Build a shareable message and direct Telegram deep link for the landlord
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
    }

    return {
      plainText,
      directTelegramUrl,
    };
  }
}

export const telegramService = new TelegramService();
