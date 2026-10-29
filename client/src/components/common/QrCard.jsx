import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Check, QrCode as QrIcon } from 'lucide-react';
import { formatMoney } from '../../utils/format.js';
import { Button } from './Button.jsx';

export function QrCard({
  qrString,
  amountCents,
  billNumber,
  merchantName = 'Sunrise Apartments',
  exchangeRate = 4100,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!qrString) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(qrString, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [qrString]);

  const handleCopy = () => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `KHQR-Invoice-${billNumber || 'payment'}.png`;
    a.click();
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col items-center max-w-xs mx-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <span className="text-xs uppercase font-bold tracking-wider text-danger flex items-center justify-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-danger"></span>
          KHQR / Bakong
        </span>
        <h4 className="text-base font-bold text-content-primary mt-1">{merchantName}</h4>
        {billNumber && (
          <p className="text-xs text-content-muted">Invoice #{billNumber}</p>
        )}
      </div>

      {/* QR Code Canvas with GUARANTEED white background and border for scan reliability */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-inner flex items-center justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="KHQR Code"
            className="w-48 h-48 block object-contain select-none"
          />
        ) : (
          <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
            <QrIcon className="w-10 h-10 animate-pulse" />
            <span className="text-xs">Generating QR...</span>
          </div>
        )}
      </div>

      {/* Amount Display */}
      {amountCents !== undefined && (
        <div className="mt-3.5 text-center">
          <div className="text-xl font-bold text-content-primary">
            {formatMoney(amountCents)}
          </div>
          <div className="text-xs text-content-muted">
            {formatMoney(amountCents, { showRiel: true, exchangeRate })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 w-full">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleCopy}
          icon={copied ? Check : Copy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
          icon={Download}
        >
          Save QR
        </Button>
      </div>
    </div>
  );
}
