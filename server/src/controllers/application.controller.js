import { applicationRepository } from '../repositories/application.repository.js';
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
   * Reject an application
   */
  async rejectApplication(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const app = applicationRepository.findById(id);
      if (!app) {
        throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
      }

      const updated = applicationRepository.updateStatus(id, 'rejected');

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
        },
      });

      res.json({ success: true, application: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const applicationController = new ApplicationController();
