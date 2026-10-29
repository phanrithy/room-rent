import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate, formatMonth } from '../utils/format.js';

export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Generation Result State
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '50',
      });
      if (month !== 'all') queryParams.append('month', month);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const data = await apiRequest(`invoices?${queryParams.toString()}`);
      setInvoices(data.items);
      setTotal(data.total);
    } catch (err) {
      showError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter, page, showError]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setGenerationResult(null);
    try {
      const res = await apiRequest('invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ month }),
      });
      setGenerationResult(res);
      showSuccess(
        `Generated ${res.created.length} invoices. (${res.skipped.length} skipped)`
      );
      fetchInvoices();
    } catch (err) {
      showError(err.message || 'Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  // Status counts
  const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;
  const partialCount = invoices.filter((i) => i.status === 'partial').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;

  const totalAmountSum = invoices.reduce((s, i) => s + i.total, 0);
  const totalBalanceSum = invoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);

  const tableColumns = [
    {
      key: 'roomNumber',
      label: t('nav.rooms'),
      sortable: true,
      render: (inv) => (
        <div>
          <span className="font-bold text-base text-content-primary">
            #{inv.roomNumber}
          </span>
          <span className="block text-[11px] text-content-muted">
            Floor {inv.floor}
          </span>
        </div>
      ),
    },
    {
      key: 'tenantName',
      label: t('nav.tenants'),
      sortable: true,
      render: (inv) => (
        <div>
          <span className="font-semibold text-content-primary">{inv.tenantName}</span>
          <span className="block text-xs font-mono text-content-muted">{inv.tenantPhone}</span>
        </div>
      ),
    },
    {
      key: 'month',
      label: t('common.month'),
      render: (inv) => (
        <span className="font-mono text-xs font-medium text-content-secondary">
          {inv.month}
        </span>
      ),
    },
    {
      key: 'total',
      label: t('invoices.amount'),
      sortable: true,
      render: (inv) => (
        <div>
          <span className="font-mono font-bold text-content-primary">
            {formatMoney(inv.total)}
          </span>
          <span className="block text-[11px] text-content-muted">
            Paid: {formatMoney(inv.paidAmount)}
          </span>
        </div>
      ),
    },
    {
      key: 'balance',
      label: t('invoices.balance'),
      sortable: true,
      render: (inv) => {
        const bal = inv.total - inv.paidAmount;
        return (
          <span
            className={`font-mono font-bold text-sm ${
              bal > 0 ? (inv.status === 'overdue' ? 'text-danger' : 'text-primary') : 'text-success'
            }`}
          >
            {formatMoney(bal)}
          </span>
        );
      },
    },
    {
      key: 'dueDate',
      label: t('invoices.dueDate'),
      render: (inv) => (
        <span className="text-xs text-content-secondary font-mono">
          {formatDate(inv.dueDate, i18n.language)}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      sortable: true,
      render: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (inv) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/invoices/${inv.id}`)}
        >
          {t('common.details')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        action={
          isStaff && (
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={handleGenerateInvoices}
              loading={generating}
            >
              {t('invoices.generate')}
            </Button>
          )
        }
      />

      {/* Generation Result Panel (if generated) */}
      {generationResult && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h3 className="font-bold text-content-primary">
                Invoice Generation for {formatMonth(month, i18n.language)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setGenerationResult(null)}
              className="text-xs text-content-muted hover:text-content-primary font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span className="text-success font-semibold">
              ✓ {generationResult.created.length} Created
            </span>
            <span className="text-content-muted">
              ℹ {generationResult.skipped.length} Skipped
            </span>
          </div>

          {generationResult.skipped.length > 0 && (
            <div className="mt-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                {t('invoices.skippedContracts')}:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {generationResult.skipped.map((skip, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-content-primary">
                        Room #{skip.roomNumber} ({skip.tenantName})
                      </span>
                      <p className="text-[11px] text-content-muted mt-0.5">
                        {skip.reason === 'ALREADY_EXISTS' && 'Already has an invoice this month'}
                        {skip.reason === 'NO_READING' && 'Missing meter reading for this month'}
                      </p>
                    </div>

                    {skip.reason === 'NO_READING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/readings?month=${month}`)}
                      >
                        Enter Reading
                      </Button>
                    )}
                    {skip.reason === 'ALREADY_EXISTS' && skip.invoiceId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoices/${skip.invoiceId}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Billed"
          value={formatMoney(totalAmountSum)}
          subtitle={`${invoices.length} invoices`}
          icon={Receipt}
          color="primary"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatMoney(totalBalanceSum)}
          subtitle="Awaiting payment"
          icon={DollarSign}
          color="warning"
        />
        <StatCard
          title={t('status.overdue')}
          value={overdueCount}
          subtitle="Past due date"
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title={t('status.paid')}
          value={paidCount}
          subtitle="Completed"
          icon={CheckCircle2}
          color="success"
        />
      </div>

      {/* Control Bar: Month Picker & Status Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-3 shadow-xs">
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <Tabs
            tabs={[
              { id: 'all', label: t('common.all'), count: total },
              { id: 'unpaid', label: t('status.unpaid'), count: unpaidCount },
              { id: 'partial', label: t('status.partial'), count: partialCount },
              { id: 'overdue', label: t('status.overdue'), count: overdueCount },
              { id: 'paid', label: t('status.paid'), count: paidCount },
            ]}
            activeTab={statusFilter}
            onChange={(tab) => {
              setStatusFilter(tab);
              setPage(1);
            }}
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <DatePicker
            mode="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Invoices List / Table */}
      <DataTable
        columns={tableColumns}
        data={invoices}
        total={total}
        page={page}
        pageSize={50}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />
    </div>
  );
}
