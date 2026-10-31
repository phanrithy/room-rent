import { applicationRepository } from '../repositories/application.repository.js';
import { tenantRepository } from '../repositories/tenant.repository.js';
import { roomRepository } from '../repositories/room.repository.js';
import { telegramService } from '../services/telegram.service.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { auditRepository } from '../repositories/audit.repository.js';

export class ApplicationController {
  /**
   * Get all pending room applications for admin review
   */
  async getPendingApplications(req, res, next) {
    try {
      const items = applicationRepository.findPending();
      res.json({
        total: items.length,
        items,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reject / Decline an application and notify tenant via Telegram
   */
  async rejectApplication(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { reason } = req.body || {};
      const app = applicationRepository.findById(id);
      if (!app) {
        throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
      }

      const updated = applicationRepository.updateStatus(id, 'rejected');

      const tenant = tenantRepository.findById(app.tenantId);
      const room = roomRepository.findById(app.roomId);

      let telegramSent = false;
      let shareInfo = null;

      if (tenant && room) {
        const tgRes = await telegramService
          .sendApplicationDeclineNotification({
            application: app,
            tenant,
            room,
            reason: reason ? reason.trim() : null,
          })
          .catch((err) => ({ success: false, error: err.message }));

        telegramSent = tgRes.success || false;
        shareInfo = telegramService.formatTenantDeclineShareMessage({
          tenant,
          room,
          reason: reason ? reason.trim() : null,
        });
      }

      auditRepository.create({
        userId: req.user.id,
        action: 'REJECT_APPLICATION',
        tableName: 'room_applications',
        recordId: id,
        detail: {
          roomId: app.roomId,
          roomNumber: app.roomNumber,
          tenantId: app.tenantId,
          tenantName: app.tenantName,
          reason: reason ? reason.trim() : null,
          telegramSent,
        },
      });

      res.json({
        success: true,
        application: updated,
        telegramSent,
        shareInfo,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const applicationController = new ApplicationController();
