import path from 'path';
import { documentService } from '../services/document.service.js';

export function uploadDocument(req, res, next) {
  try {
    const contractId = parseInt(req.params.contractId, 10);
    const kind = req.body.kind || 'contract';
    const doc = documentService.uploadDocument(
      req.user.id,
      contractId,
      kind,
      req.file
    );
    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
}

export function listDocuments(req, res, next) {
  try {
    const contractId = parseInt(req.params.contractId, 10);
    const documents = documentService.listDocuments(req.user, contractId);
    res.json({ items: documents });
  } catch (err) {
    next(err);
  }
}

export function getDocumentFile(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { doc, filePath } = documentService.getDocument(req.user, id);

    const ext = path.extname(doc.fileName).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
        ? 'image/png'
        : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.originalName}"`
    );
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export function deleteDocument(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = documentService.deleteDocument(req.user.id, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
