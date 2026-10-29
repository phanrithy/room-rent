import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Printer,
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Zap,
  Droplets,
  Share2,
  Download,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { IconButton } from '../components/common/IconButton.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { QrCard } from '../components/common/QrCard.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate, formatMonth } from '../utils/format.js';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Extra Charges inline form
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmountCents, setChargeAmountCents] = useState(500); // $5.00
  const [chargeSubmitting, setChargeSubmitting] = useState(false);

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`invoices/${id}`);
      setInvoice(data.invoice);
    } catch (err) {
      showError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.month}-${invoice.roomNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showSuccess('PDF downloaded successfully');
    } catch (err) {
      showError(err.message || 'Failed to download PDF');
    }
  };

  const handleShare = async () => {
    const invoiceTitle = `Invoice INV-${invoice.month}-${invoice.roomNumber} for Room #${invoice.roomNumber}`;
    const shareText = `Room Rent Invoice: ${invoiceTitle}\nTotal: $${(invoice.total / 100).toFixed(2)}\nDue Date: ${invoice.dueDate}\nStatus: ${invoice.status.toUpperCase()}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invoiceTitle,
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {
        // Ignored
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        showSuccess('Invoice summary copied to clipboard');
      } catch {
        showError('Unable to copy to clipboard');
      }
    }
  };

  const handleOpenPayment = (amountToPay = null) => {
    if (!invoice) return;
    const balance = invoice.total - invoice.paidAmount;
    setPaymentAmountCents(amountToPay !== null ? amountToPay : balance);
    setPaymentMethod('cash');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (paymentAmountCents <= 0) {
      showError('Payment amount must be greater than zero');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await apiRequest('payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: parseInt(id, 10),
          amount: paymentAmountCents,
          method: paymentMethod,
          note: paymentNote.trim() || null,
        }),
      });
      showSuccess('Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      fetchInvoice();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Payment recording failed'));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleAddChargeSubmit = async (e) => {
    e.preventDefault();
    if (!chargeDescription.trim()) return;
    setChargeSubmitting(true);
    try {
      await apiRequest(`invoices/${id}/charges`, {
        method: 'POST',
        body: JSON.stringify({
          description: chargeDescription.trim(),
          amount: chargeAmountCents,
        }),
      });
      showSuccess('Extra charge added');
      setChargeDescription('');
      setShowAddCharge(false);
      fetchInvoice();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to add charge'));
    } finally {
      setChargeSubmitting(false);
    }
  };

  const handleRemoveCharge = async (itemId) => {
    try {
      await apiRequest(`invoices/${id}/charges/${itemId}`, { method: 'DELETE' });
      showSuccess('Charge removed');
      fetchInvoice();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to remove charge'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-10" width="w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton height="h-96" className="lg:col-span-2" />
          <Skeleton height="h-96" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <div className="p-12 text-center text-content-muted">
          <p className="font-semibold text-content-primary">Invoice Not Found</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </Card>
    );
  }

  const balance = invoice.total - invoice.paidAmount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print">
        <PageHeader
          title={`Invoice #${invoice.id} (${invoice.month})`}
          subtitle={`Room #${invoice.roomNumber} • ${invoice.tenantName}`}
          backTo="/invoices"
          breadcrumbs={[
            { label: t('nav.invoices'), to: '/invoices' },
            { label: `Invoice #${invoice.id}` },
          ]}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={Share2} onClick={handleShare}>
                {t('common.share', 'Share')}
              </Button>
              <Button variant="secondary" icon={Download} onClick={handleDownloadPdf}>
                PDF
              </Button>
              <Button variant="secondary" icon={Printer} onClick={handlePrint}>
                {t('common.print')}
              </Button>
              {balance > 0 && isStaff && (
                <Button
                  variant="primary"
                  icon={DollarSign}
                  onClick={() => handleOpenPayment(balance)}
                >
                  {t('invoices.payFull')}
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANEL: Printable Document */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-xs print:bg-black">
                  SR
                </div>
                <div>
                  <h2 className="text-xl font-bold text-content-primary">
                    {invoice.propertyName || 'Sunrise Apartments'}
                  </h2>
                  <p className="text-xs text-content-muted">
                    {invoice.propertyAddress || 'Street 271, Phnom Penh, Cambodia'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-content-muted block">
                {t('invoices.title')}
              </span>
              <div className="text-xl font-black font-mono text-content-primary">
                INV-{invoice.month.replace('-', '')}-{invoice.roomNumber}
              </div>
              <div className="mt-1.5 flex justify-end">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Tenant & Period Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-subtle border border-border text-xs">
            <div>
              <span className="text-content-muted block uppercase font-bold tracking-wider mb-1">
                Billed To (អ្នកជួល)
              </span>
              <p className="font-bold text-base text-content-primary">{invoice.tenantName}</p>
              <p className="font-mono text-content-secondary mt-0.5">{invoice.tenantPhone}</p>
              <p className="text-content-muted mt-0.5">
                Room #{invoice.roomNumber} • Floor {invoice.floor}
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <div>
                <span className="text-content-muted">Billing Month: </span>
                <span className="font-semibold text-content-primary">
                  {formatMonth(invoice.month, i18n.language)} ({invoice.month})
                </span>
              </div>
              <div>
                <span className="text-content-muted">{t('invoices.dueDate')}: </span>
                <span className="font-semibold text-danger font-mono">
                  {formatDate(invoice.dueDate, i18n.language)}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-xs font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Description (ការពិពណ៌នា)</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Amount ($)</th>
                  <th className="px-2 py-3 text-right no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-primary">
                {/* 1. Rent */}
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-semibold block">Monthly Room Rent</span>
                    <span className="text-xs text-content-muted">Room #{invoice.roomNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-content-muted">—</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {formatMoney(invoice.rent)}
                  </td>
                  <td className="no-print"></td>
                </tr>

                {/* 2. Electricity */}
                <tr>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Zap className="w-4 h-4 text-warning" />
                      <span>Electricity (ថ្លៃភ្លើង)</span>
                    </div>
                    <span className="text-xs text-content-muted block">
                      Prev: {invoice.electricPrev || '—'} → Curr: {invoice.electricCurrent || '—'} (Units: {Math.max(0, (invoice.electricCurrent || 0) - (invoice.electricPrev || 0))} kWh)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-content-muted">
                    $1.50/kWh
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {formatMoney(invoice.electricCost)}
                  </td>
                  <td className="no-print"></td>
                </tr>

                {/* 3. Water */}
                <tr>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Droplets className="w-4 h-4 text-info" />
                      <span>Water Usage (ថ្លៃទឹក)</span>
                    </div>
                    <span className="text-xs text-content-muted block">
                      Prev: {invoice.waterPrev || '—'} → Curr: {invoice.waterCurrent || '—'} (Units: {Math.max(0, (invoice.waterCurrent || 0) - (invoice.waterPrev || 0))} m³)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-content-muted">
                    $0.50/m³
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {formatMoney(invoice.waterCost)}
                  </td>
                  <td className="no-print"></td>
                </tr>

                {/* 4. Extra Charges */}
                {invoice.items?.map((item) => (
                  <tr key={item.id} className="bg-surface-subtle/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold">{item.description}</span>
                      <span className="text-[11px] text-content-muted block">Extra service / fee</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-content-muted">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="px-2 py-3 text-right no-print">
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(item.id)}
                          className="p-1 rounded text-content-muted hover:text-danger hover:bg-danger-bg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 5. Late Fee (if applied) */}
                {invoice.lateFee > 0 && (
                  <tr className="bg-danger-bg/20 text-danger-text">
                    <td className="px-4 py-3 font-semibold">Late Fee (ថ្លៃពិន័យយឺតយ៉ាវ)</td>
                    <td className="px-4 py-3 text-right text-xs">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {formatMoney(invoice.lateFee)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Charge Inline (no-print) */}
          {isStaff && (
            <div className="no-print pt-2">
              {!showAddCharge ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddCharge(true)}
                >
                  {t('invoices.addCharge')}
                </Button>
              ) : (
                <form
                  onSubmit={handleAddChargeSubmit}
                  className="p-3.5 rounded-xl border border-border bg-surface-subtle flex flex-col sm:flex-row items-end gap-3"
                >
                  <div className="flex-1 w-full">
                    <Input
                      label="Charge Description"
                      placeholder="e.g. WiFi fee, trash collection, parking..."
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <MoneyInput
                      label="Amount ($)"
                      value={chargeAmountCents}
                      onChange={(c) => setChargeAmountCents(c)}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      type="button"
                      onClick={() => setShowAddCharge(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      type="submit"
                      loading={chargeSubmitting}
                    >
                      Add
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Totals Summary */}
          <div className="flex flex-col items-end gap-2 pt-4 border-t border-border text-sm">
            <div className="flex items-center justify-between w-64 text-content-secondary">
              <span>{t('invoices.amount')}:</span>
              <span className="font-mono font-bold text-content-primary">
                {formatMoney(invoice.total)}
              </span>
            </div>

            <div className="flex items-center justify-between w-64 text-content-secondary">
              <span>{t('invoices.paid')}:</span>
              <span className="font-mono font-bold text-success">
                {formatMoney(invoice.paidAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between w-64 pt-2 border-t border-border font-bold text-base text-content-primary">
              <span>{t('invoices.balance')}:</span>
              <span className="font-mono text-xl text-primary font-black">
                {formatMoney(balance)}
              </span>
            </div>
            <div className="text-xs text-content-muted">
              {formatMoney(balance, { showRiel: true })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Payment Panel & Dynamic KHQR (no-print) */}
        <div className="no-print space-y-6">
          {/* Dynamic KHQR Card */}
          {balance > 0 && invoice.khqrString && (
            <QrCard
              qrString={invoice.khqrString}
              amountCents={balance}
              billNumber={`INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`}
              merchantName={invoice.propertyName || 'Sunrise Apartments'}
            />
          )}

          {/* Payment Action Card */}
          <Card title={t('invoices.addPayment')}>
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
                <span className="text-xs text-content-muted">{t('invoices.balance')}</span>
                <span className="font-mono font-bold text-lg text-content-primary">
                  {formatMoney(balance)}
                </span>
              </div>

              {balance > 0 ? (
                isStaff && (
                  <div className="flex flex-col gap-2.5">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => handleOpenPayment(balance)}
                    >
                      {t('invoices.payFull')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full"
                      onClick={() => handleOpenPayment()}
                    >
                      Record Custom Payment
                    </Button>
                  </div>
                )
              ) : (
                <div className="p-3 bg-success-bg border border-success-border rounded-lg text-xs text-success-text font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invoice is fully paid</span>
                </div>
              )}
            </div>
          </Card>

          {/* Payments Timeline */}
          <Card title="Payment Timeline">
            {!invoice.payments || invoice.payments.length === 0 ? (
              <p className="text-xs text-content-muted italic">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-border bg-surface-subtle flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-content-primary">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        <span className="uppercase">{p.method}</span>
                        <span className="text-content-muted font-normal">
                          ({p.source})
                        </span>
                      </div>
                      <p className="text-[11px] text-content-muted mt-0.5">
                        {formatDate(p.paidAt, i18n.language)}
                      </p>
                      {p.note && <p className="text-[11px] italic mt-0.5">{p.note}</p>}
                    </div>

                    <div className="font-mono font-bold text-sm text-success">
                      +{formatMoney(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t('invoices.addPayment')}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="p-3 bg-surface-subtle border border-border rounded-lg flex items-center justify-between text-xs">
            <span className="text-content-muted">Remaining Balance:</span>
            <span className="font-mono font-bold text-sm text-content-primary">
              {formatMoney(balance)}
            </span>
          </div>

          <MoneyInput
            label={t('payments.amount')}
            value={paymentAmountCents}
            onChange={(c) => setPaymentAmountCents(c)}
            required
            helperText="Cannot exceed remaining balance"
          />

          <Select
            label={t('payments.method')}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'cash', label: `${t('payments.cash')} (សាច់ប្រាក់)` },
              { value: 'bank', label: `${t('payments.bank')} (ផ្ទេរតាមធនាគារ)` },
              { value: 'qr', label: `${t('payments.qr')} (KHQR / បាគង)` },
            ]}
          />

          <Input
            label={t('common.note')}
            placeholder="e.g. Received in cash at building reception"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" loading={paymentSubmitting}>
              {t('common.confirm')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
