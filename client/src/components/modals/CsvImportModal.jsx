import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  ClipboardPaste,
} from 'lucide-react';

import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Simple CSV parser (handles commas, trims whitespace and quotes)
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
    const rowObj = {};
    headers.forEach((h, index) => {
      rowObj[h] = rawCols[index] !== undefined ? rawCols[index] : '';
    });
    rows.push(rowObj);
  }
  return rows;
}

export function CsvImportModal({
  isOpen,
  onClose,
  title,
  type = 'rooms', // 'rooms' | 'tenants'
  onImport,
  onSuccess,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [validatedRows, setValidatedRows] = useState([]);
  const [importing, setImporting] = useState(false);

  const sampleCsv =
    type === 'rooms'
      ? 'room_number,floor,monthly_rent,note\n101,1,100,Corner room\n102,1,110,Near elevator\n201,2,120,Balcony'
      : 'name,phone,id_number,email\nSokha Chan,012345678,010123456,sokha@example.com\nVannak Lim,098765432,020987654,vannak@example.com';

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_sample.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const handleProcessText = (text) => {
    setRawText(text);
    const raw = parseCsv(text);
    setParsedRows(raw);

    // Validation
    const validated = raw.map((r, i) => {
      let isValid = true;
      let error = '';

      if (type === 'rooms') {
        const roomNum = r.room_number || r.roomnumber || r.room;
        const rent = r.monthly_rent || r.monthlyrent || r.rent;
        if (!roomNum) {
          isValid = false;
          error = 'Missing room_number';
        } else if (!rent || isNaN(parseInt(rent, 10))) {
          isValid = false;
          error = 'Missing or invalid monthly_rent';
        }
      } else {
        const name = r.name || r.fullname;
        const phone = r.phone;
        if (!name) {
          isValid = false;
          error = 'Missing name';
        } else if (!phone) {
          isValid = false;
          error = 'Missing phone';
        }
      }

      return {
        rowNum: i + 1,
        data: r,
        isValid,
        error,
      };
    });

    setValidatedRows(validated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleProcessText(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validItems = validatedRows
      .filter((v) => v.isValid)
      .map((v) => {
        if (type === 'rooms') {
          return {
            roomNumber: v.data.room_number || v.data.roomnumber || v.data.room,
            floor: parseInt(v.data.floor || '1', 10),
            // Convert dollar string to cents
            monthlyRent: Math.round(
              parseFloat(v.data.monthly_rent || v.data.monthlyrent || v.data.rent) * 100
            ),
            note: v.data.note || '',
          };
        } else {
          return {
            name: v.data.name || v.data.fullname,
            phone: v.data.phone,
            idNumber: v.data.id_number || v.data.idnumber || '',
            email: v.data.email || '',
          };
        }
      });

    if (validItems.length === 0) {
      showError('No valid rows found to import');
      return;
    }

    setImporting(true);
    try {
      const res = await onImport(validItems);
      showSuccess(`Successfully imported ${res.imported} records!`);
      if (res.errors && res.errors.length > 0) {
        showError(`Encountered ${res.errors.length} skipped rows.`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const errorCount = validatedRows.filter((r) => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={handleDownloadSample} icon={Download} size="sm">
            {t('import.sampleCsv')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={importing}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteImport}
              loading={importing}
              disabled={validCount === 0}
            >
              {t('import.importButton', { count: validCount })}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Upload or paste area */}
        <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-surface-subtle space-y-3">
          <FileSpreadsheet className="w-8 h-8 text-primary mx-auto opacity-75" />
          <p className="text-xs text-content-secondary">
            {t('import.instructions')}{' '}
            <code className="font-mono text-content-primary font-bold">
              {type === 'rooms'
                ? 'room_number, floor, monthly_rent, note'
                : 'name, phone, id_number, email'}
            </code>
          </p>

          <div className="flex items-center justify-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold hover:bg-surface-subtle shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5 text-primary" />
              Upload .CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-content-muted">or paste text below</span>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => handleProcessText(e.target.value)}
            placeholder={`Paste CSV content here...\n${sampleCsv}`}
            rows={4}
            className="w-full text-xs font-mono bg-surface border border-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Validation Summary */}
        {validatedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-content-primary">{t('import.preview')}</span>
              <div className="flex items-center gap-3">
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('import.validRows', { count: validCount })}
                </span>
                {errorCount > 0 && (
                  <span className="text-danger flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('import.errorRows', { count: errorCount })}
                  </span>
                )}
              </div>
            </div>

            {/* Table Preview */}
            <div className="max-h-56 overflow-y-auto border border-border rounded-lg text-xs">
              <table className="w-full text-left">
                <thead className="bg-surface-subtle text-content-secondary border-b border-border sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {validatedRows.map((r) => (
                    <tr
                      key={r.rowNum}
                      className={r.isValid ? 'bg-surface' : 'bg-danger-bg/40'}
                    >
                      <td className="px-3 py-1.5 font-mono text-content-muted">
                        #{r.rowNum}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger">
                            <AlertCircle className="w-3 h-3" /> {r.error}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-content-secondary line-clamp-1">
                        {Object.entries(r.data)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
