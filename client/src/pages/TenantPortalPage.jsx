import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DoorOpen,
  Receipt,
  CreditCard,
  Wrench,
  Download,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  Building2,
  QrCode,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Card } from '../components/common/Card.jsx';
import { QrCard } from '../components/common/QrCard.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function TenantPortalPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Maintenance Ticket Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const fetchTenantDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('me/dashboard');
      setDashboard(data);
    } catch (err) {
      showError(err.message || 'Failed to load tenant dashboard');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTenantDashboard();
  }, [fetchTenantDashboard]);

  const handleDownloadInvoicePdf = async (invoiceId, month, roomNumber) => {
    try {
      const token = localStorage.getItem('app_token');
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${month}-${roomNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      showError(err.message || 'Failed to download invoice PDF');
    }
  };

  const handleDownloadReceiptPdf = async (paymentId) => {
    try {
      const token = localStorage.getItem('app_token');
      const res = await fetch(`/api/payments/${paymentId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${String(paymentId).padStart(5, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      showError(err.message || 'Failed to download receipt PDF');
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;
    setSubmittingIssue(true);
    try {
      await apiRequest('me/maintenance', {
        method: 'POST',
        body: JSON.stringify({ description: issueDescription.trim() }),
      });
      showSuccess('Maintenance ticket submitted to management');
      setIsIssueModalOpen(false);
      setIssueDescription('');
      fetchTenantDashboard();
    } catch (err) {
      showError(err.message || 'Failed to submit issue');
    } finally {
      setSubmittingIssue(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-10" width="w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="h-64" />
          <Skeleton height="h-64" />
        </div>
      </div>
    );
  }

  const { tenant, activeContract, currentUnpaidInvoice, recentInvoices, recentMaintenance } =
    dashboard || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Welcome, ${tenant?.name || user?.username}!`}
        subtitle="Your room rental portal, bill payments, and maintenance requests"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Room Info & Quick Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Lease Card */}
          {activeContract ? (
            <Card
              title={`Room #${activeContract.roomNumber} (Floor ${activeContract.floor})`}
              subtitle="Active Residential Lease"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div className="p-3 bg-surface-subtle border border-border rounded-xl">
                  <span className="text-content-muted block">Monthly Rent</span>
                  <span className="font-mono font-bold text-base text-content-primary">
                    {formatMoney(activeContract.rentAmount)}
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle border border-border rounded-xl">
                  <span className="text-content-muted block">Deposit Held</span>
                  <span className="font-mono font-bold text-base text-content-primary">
                    {formatMoney(activeContract.deposit)}
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle border border-border rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-content-muted block">Lease Period</span>
                  <span className="font-semibold text-content-primary">
                    {activeContract.startDate} → {activeContract.endDate}
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="No Active Lease">
              <p className="text-xs text-content-muted p-4">
                You do not currently have an active room rental contract registered.
              </p>
            </Card>
          )}

          {/* Current Unpaid Bill */}
          {currentUnpaidInvoice ? (
            <Card
              title={`Current Bill: ${currentUnpaidInvoice.month}`}
              subtitle={`Due Date: ${formatDate(currentUnpaidInvoice.dueDate, i18n.language)}`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() =>
                    handleDownloadInvoicePdf(
                      currentUnpaidInvoice.id,
                      currentUnpaidInvoice.month,
                      activeContract?.roomNumber || '101'
                    )
                  }
                >
                  Invoice PDF
                </Button>
              }
            >
              <div className="flex flex-col sm:flex-row items-center gap-6 p-2">
                {currentUnpaidInvoice.khqrString && (
                  <div className="shrink-0 text-center">
                    <QrCard
                      qrValue={currentUnpaidInvoice.khqrString}
                      amount={currentUnpaidInvoice.total - currentUnpaidInvoice.paidAmount}
                      currency="USD"
                      title="Bakong / KHQR"
                      subtitle="Scan with any banking app"
                      size={160}
                    />
                  </div>
                )}
                <div className="space-y-3 flex-1 text-xs w-full">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-content-muted">Monthly Rent:</span>
                    <span className="font-mono font-bold">{formatMoney(currentUnpaidInvoice.rent)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-content-muted">Electricity:</span>
                    <span className="font-mono font-bold">{formatMoney(currentUnpaidInvoice.electricCost)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-content-muted">Water:</span>
                    <span className="font-mono font-bold">{formatMoney(currentUnpaidInvoice.waterCost)}</span>
                  </div>
                  {currentUnpaidInvoice.otherCharges > 0 && (
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-content-muted">Extra Charges:</span>
                      <span className="font-mono font-bold">{formatMoney(currentUnpaidInvoice.otherCharges)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-sm font-bold text-content-primary">Total Balance Due:</span>
                    <span className="font-mono font-black text-xl text-primary">
                      {formatMoney(currentUnpaidInvoice.total - currentUnpaidInvoice.paidAmount)}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-content-muted">
                    {formatMoney(currentUnpaidInvoice.total - currentUnpaidInvoice.paidAmount, { showRiel: true })}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="All Invoices Paid">
              <div className="flex items-center gap-3 p-4 bg-success-bg/40 border border-success-border rounded-xl text-success">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">
                  You are all caught up! No outstanding balances for your room.
                </span>
              </div>
            </Card>
          )}

          {/* Recent Invoices History */}
          <Card title="Billing History" subtitle="Your recent rental invoices">
            <div className="divide-y divide-border text-xs">
              {recentInvoices?.length === 0 ? (
                <p className="py-4 text-center text-content-muted">No invoices yet.</p>
              ) : (
                recentInvoices?.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-bold text-content-primary font-mono block">
                        Invoice {inv.month}
                      </span>
                      <span className="text-content-muted text-[11px]">
                        Due: {inv.dueDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={inv.status} />
                      <span className="font-mono font-bold text-content-primary">
                        {formatMoney(inv.total)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Download}
                        onClick={() =>
                          handleDownloadInvoicePdf(inv.id, inv.month, activeContract?.roomNumber)
                        }
                      >
                        PDF
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Maintenance Tickets */}
        <div className="space-y-6">
          <Card
            title="Room Maintenance"
            subtitle="Report plumbing, electrical, or appliance issues"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsIssueModalOpen(true)}
              >
                New Request
              </Button>
            }
          >
            <div className="space-y-3 pt-2 text-xs">
              {recentMaintenance?.length === 0 ? (
                <p className="text-content-muted text-center py-6">
                  No issues reported. Room is in good condition!
                </p>
              ) : (
                recentMaintenance?.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-border bg-surface-subtle space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-content-primary line-clamp-1">
                        {m.description}
                      </span>
                      <StatusBadge status={m.status} />
                    </div>
                    <span className="text-[11px] text-content-muted block">
                      Submitted: {formatDate(m.createdAt?.split('T')[0], i18n.language)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Landlord Contact">
            <div className="space-y-2 text-xs text-content-secondary">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-content-primary">Sunrise Apartments Office</span>
              </div>
              <p className="text-content-muted">Street 271, Boeng Tumpun, Phnom Penh</p>
              <p className="pt-2">Office Hours: 8:00 AM – 6:00 PM (Mon – Sat)</p>
            </div>
          </Card>
        </div>
      </div>

      {/* New Maintenance Request Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Report Room Issue"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsIssueModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateIssue}
              loading={submittingIssue}
            >
              Submit Ticket
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateIssue} className="space-y-4">
          <Input
            label="Describe the issue in your room"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="e.g. Bathroom light bulb not working, aircon leaking"
            required
          />
        </form>
      </Modal>
    </div>
  );
}
