import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();
router.use(authenticateToken);

// Authenticated document file viewing
router.get('/:id/file', documentController.getDocumentFile);

// Contract documents list
router.get('/contract/:contractId', documentController.listDocuments);

// Document upload (admin and staff)
router.post(
  '/contract/:contractId',
  requireRole('admin', 'staff'),
  upload.single('file'),
  documentController.uploadDocument
);

// Delete document (admin only)
router.delete('/:id', requireRole('admin'), documentController.deleteDocument);

export default router;
