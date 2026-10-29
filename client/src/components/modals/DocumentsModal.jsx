import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Image,
  FileCheck,
  Shield,
  Download,
} from 'lucide-react';

import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Select } from '../common/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiRequest } from '../../utils/api.js';

export function DocumentsModal({ isOpen, onClose, contract }) {
  const { t } = useTranslation();
  const { isAdmin, isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload Form
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState('contract');
  const [uploading, setUploading] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const data = await apiRequest(`documents/contract/${contract.id}`);
      setDocuments(data.items || []);
    } catch (err) {
      showError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [contract, showError]);

  useEffect(() => {
    if (isOpen && contract) {
      fetchDocs();
      setFile(null);
    }
  }, [isOpen, contract, fetchDocs]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      showError('Please choose a file to upload');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      const token = localStorage.getItem('app_token');
      const res = await fetch(`/api/documents/contract/${contract.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      showSuccess('Document uploaded');
      setFile(null);
      fetchDocs();
    } catch (err) {
      showError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await apiRequest(`documents/${docId}`, { method: 'DELETE' });
      showSuccess('Document deleted');
      fetchDocs();
    } catch (err) {
      showError(err.message || 'Failed to delete');
    }
  };

  const handleView = async (doc) => {
    try {
      const token = localStorage.getItem('app_token');
      const res = await fetch(`/api/documents/${doc.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to view file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      showError('Unable to open document file');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contract Documents: Room #${contract?.roomNumber} • ${contract?.tenantName}`}
      maxWidth="max-w-xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Upload Box (Admin & Staff) */}
        {isStaff && (
          <form
            onSubmit={handleUpload}
            className="p-3 bg-surface-subtle border border-border rounded-xl space-y-3"
          >
            <span className="font-bold text-content-primary block">
              Upload New Document (PDF, JPG, PNG &lt; 5MB)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                options={[
                  { value: 'contract', label: 'Signed Lease Agreement' },
                  { value: 'id_copy', label: 'National ID / Passport Copy' },
                  { value: 'other', label: 'Other Document / Photo' },
                ]}
              />
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/jpg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                icon={Upload}
                type="submit"
                loading={uploading}
                disabled={!file}
              >
                Upload File
              </Button>
            </div>
          </form>
        )}

        {/* Document List */}
        <div className="space-y-2">
          <span className="font-bold text-content-primary block">
            Stored Documents ({documents.length})
          </span>

          {loading ? (
            <p className="text-content-muted py-4 text-center">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-content-muted py-6 text-center border border-dashed border-border rounded-lg">
              No documents uploaded for this lease yet.
            </p>
          ) : (
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 hover:bg-surface-subtle transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {doc.fileName.endsWith('.pdf') ? (
                      <FileText className="w-5 h-5 text-danger shrink-0" />
                    ) : (
                      <Image className="w-5 h-5 text-primary shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-semibold text-content-primary block truncate">
                        {doc.originalName}
                      </span>
                      <span className="text-[11px] text-content-muted uppercase">
                        {doc.kind.replace('_', ' ')} • {doc.uploadedAt ? doc.uploadedAt.split('T')[0] : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => handleView(doc)}
                    >
                      View
                    </Button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-danger hover:bg-danger-bg rounded-md"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
