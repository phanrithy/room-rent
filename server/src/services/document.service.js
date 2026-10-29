import path from 'path';
import fs from 'fs';
import { getDb } from '../db/connection.js';
import { documentRepository } from '../repositories/document.repository.js';
import { contractRepository } from '../repositories/contract.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

export class DocumentService {
  uploadDocument(userId, contractId, kind, file) {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const contract = contractRepository.findById(contractId);
    if (!contract) {
      // Remove uploaded file if contract not found
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundError('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    const validKinds = ['id_copy', 'contract', 'other'];
    const docKind = validKinds.includes(kind) ? kind : 'other';

    const db = getDb();
    return db.transaction(() => {
      const docId = documentRepository.create({
        contractId,
        kind: docKind,
        fileName: file.filename,
        originalName: file.originalname,
      });

      auditRepository.create({
        userId,
        action: 'UPLOAD_DOCUMENT',
        tableName: 'documents',
        recordId: docId,
        detail: {
          contractId,
          kind: docKind,
          fileName: file.filename,
          originalName: file.originalname,
        },
      });

      return documentRepository.findById(docId);
    })();
  }

  listDocuments(currentUser, contractId) {
    const contract = contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contract not found', 'CONTRACT_NOT_FOUND');
    }
    if (currentUser.role === 'tenant' && contract.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own documents');
    }
    return documentRepository.findByContract(contractId);
  }

  getDocument(currentUser, id) {
    const doc = documentRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const contract = contractRepository.findById(doc.contractId);
    if (contract && currentUser.role === 'tenant' && contract.tenantId !== currentUser.tenantId) {
      throw new ForbiddenError('You can only view your own documents');
    }

    const filePath = path.join(uploadDir, doc.fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Document file not found on server', 'FILE_NOT_FOUND');
    }

    return { doc, filePath };
  }

  deleteDocument(userId, id) {
    const doc = documentRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const db = getDb();
    return db.transaction(() => {
      documentRepository.delete(id);

      const filePath = path.join(uploadDir, doc.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      auditRepository.create({
        userId,
        action: 'DELETE_DOCUMENT',
        tableName: 'documents',
        recordId: id,
        detail: { originalName: doc.originalName, contractId: doc.contractId },
      });

      return { success: true };
    })();
  }
}

export const documentService = new DocumentService();
