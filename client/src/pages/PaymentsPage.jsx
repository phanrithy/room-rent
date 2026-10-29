import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Printer,
  Receipt,
  User,
  DoorOpen,
  CheckCircle2,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (methodFilter !== 'all') queryParams.append('method', methodFilter);

      const data = await apiRequest(`payments?${queryParams.toString()}`);
      setPayments(data.items);
      setTotal(data.total);
    } catch (err) {
      showError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [methodFilter, page, showError]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openReceipt = async (paymentId) => {
    try {
      const data = await apiRequest(`payments/${paymentId}`);
      setSelectedReceipt(data.payment);
    } catch (err) {
      showError('Failed to load receipt');
    }
  };

  const totalCollectedCents = payments.reduce((sum, p) => sum + p.amount, 0);

  const tableColumns = [
    {
      key: 'id',
      label: 'Receipt #',
      render: (p) => (
        <span className="font-mono text-xs font-bold text-content-primary">
          REC-{String(p.id).padStart(5, '0')}
        </span>
      ),
    },
    {
      key: 'paidAt',
      label: t('payments.date'),
      sortable: true,
      render: (p) => (
        <span className="text-xs text-content-secondary font-mono">
          {formatDate(p.paidAt, i18n.language)}
        </span>
      ),
    },
    {
      key: 'room',
      label: t('nav.rooms'),
      render: (p) => (
        <span className="font-bold text-content-primary">#{p.roomNumber}</span>
      ),
    },
    {
      key: 'tenant',
      label: t('nav.tenants'),
      render: (p) => (
        <span className="text-xs font-medium text-content-primary">{p.tenantName}</span>
      ),
    },
    {
      key: 'method',
      label: t('payments.method'),
      render: (p) => (
        <span className="inline-flex items-center gap-1 text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border text-content-secondary">
          <CreditCard className="w-3 h-3 text-primary" />
          {p.method}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('payments.amount'),
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-base text-success">
          +{formatMoney(p.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (p) => (
        <Button variant="ghost" size="sm" onClick={() => openReceipt(p.id)}>
          {t('payments.receipt')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payments.title')}
        subtitle="Chronological log of rental and utility payments received"
      />

      {/* Filter Tabs */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex items-center justify-between">
        <Tabs
          tabs={[
            { id: 'all', label: t('common.all') },
            { id: 'cash', label: t('payments.cash') },
            { id: 'bank', label: t('payments.bank') },
            { id: 'qr', label: t('payments.qr') },
          ]}
          activeTab={methodFilter}
          onChange={(tab) => {
            setMethodFilter(tab);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={tableColumns}
        data={payments}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Official Payment Receipt Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Official Payment Receipt"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setSelectedReceipt(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              {t('common.print')}
            </Button>
          </div>
        }
      >
        {selectedReceipt && (
          <div className="p-4 bg-surface-subtle border border-border rounded-xl space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-border">
              <h3 className="font-bold text-base text-content-primary">
                {selectedReceipt.propertyName || 'Sunrise Apartments'}
              </h3>
              <p className="text-content-muted">{selectedReceipt.propertyAddress}</p>
              <span className="inline-block mt-2 font-mono font-bold text-xs bg-success-bg text-success px-2 py-0.5 rounded-full border border-success-border">
                RECEIPT #{String(selectedReceipt.id).padStart(5, '0')}
              </span>
            </div>

            <div className="space-y-2 text-content-secondary">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold text-content-primary">
                  {formatDate(selectedReceipt.paidAt, i18n.language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tenant Name:</span>
                <span className="font-semibold text-content-primary">{selectedReceipt.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span>Room Number:</span>
                <span className="font-semibold text-content-primary">#{selectedReceipt.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold text-content-primary uppercase">
                  {selectedReceipt.method} ({selectedReceipt.source})
                </span>
              </div>
              {selectedReceipt.note && (
                <div className="flex justify-between">
                  <span>Note:</span>
                  <span className="font-medium italic text-content-primary">{selectedReceipt.note}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-baseline justify-between text-base font-bold">
              <span>Amount Paid:</span>
              <span className="font-mono text-xl text-success font-black">
                {formatMoney(selectedReceipt.amount)}
              </span>
            </div>
            <div className="text-right text-[11px] text-content-muted">
              {formatMoney(selectedReceipt.amount, { showRiel: true })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
