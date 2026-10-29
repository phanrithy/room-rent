import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { Printer, Download, Copy, Check, QrCode, Building2, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { formatMoney } from '../../utils/format.js';
import { useToast } from '../../context/ToastContext.jsx';

export function RoomQrPosterModal({ isOpen, onClose, room }) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const applyUrl = room
    ? `${window.location.origin}/apply?room=${encodeURIComponent(room.roomNumber)}`
    : '';

  useEffect(() => {
    if (room && applyUrl) {
      QRCode.toDataURL(applyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed', err));
    }
  }, [room, applyUrl]);

  if (!room) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    showSuccess(t('common.copied', 'Application link copied to clipboard!'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `room-${room.roomNumber}-qr-apply.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>Room {room.roomNumber} - Scan to Rent QR Poster</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-6">
        {/* Printable Poster Card */}
        <div
          id="room-qr-poster"
          className="bg-white text-slate-900 border-2 border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm"
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-600 mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Sunrise Apartments
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Residential Room Rental • Phnom Penh
            </p>
          </div>

          {/* Room Badge */}
          <div className="inline-block px-5 py-2 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-2xl font-black text-blue-600 block">
              Room {room.roomNumber}
            </span>
            <span className="text-xs text-slate-600 font-semibold">
              Floor {room.floor} • {formatMoney(room.monthlyRent)}/month
            </span>
          </div>

          {/* High Res QR Code Canvas */}
          <div className="flex justify-center py-2">
            {qrDataUrl ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <img
                  src={qrDataUrl}
                  alt={`Apply for Room ${room.roomNumber}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          {/* Bilingual Instructions */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              ស្កេនទូរស័ព្ទដើម្បីដាក់ពាក្យជួលបន្ទប់នេះ
            </p>
            <p className="text-xs text-slate-500">
              Scan with your phone camera to apply & submit your ID card
            </p>
          </div>

          {/* Direct URL text */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 truncate font-mono">
            {applyUrl}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopyLink}
            >
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadQr}
            >
              Download QR
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print Poster
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export default RoomQrPosterModal;