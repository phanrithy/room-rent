import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Wrench,
  Sparkles,
  Zap,
  HelpCircle,
  Building2,
  DollarSign,
  Filter,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { Select } from '../components/common/Select.jsx';
import { Input } from '../components/common/Input.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const { isAdmin, isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Category summary stats
  const [summary, setSummary] = useState({ categories: [], totalSpent: 0 });

  // Rooms for dropdown selector
  const [rooms, setRooms] = useState([]);

  // Record Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('repair');
  const [amountCents, setAmountCents] = useState(1000); // $10.00
  const [spentAt, setSpentAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Dialog State
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = async () => {
    try {
      const data = await apiRequest('rooms?pageSize=100');
      setRooms(data.items || []);
    } catch {
      // Ignore
    }
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (month !== 'all') queryParams.append('month', month);
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter);

      const [listRes, summaryRes] = await Promise.all([
        apiRequest(`expenses?${queryParams.toString()}`),
        apiRequest(`expenses/summary?${month !== 'all' ? `month=${month}` : ''}`),
      ]);

      setExpenses(listRes.items || []);
      setTotal(listRes.total || 0);
      setSummary(summaryRes || { categories: [], totalSpent: 0 });
    } catch (err) {
      showError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [month, categoryFilter, page, showError]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenCreate = () => {
    setCategory('repair');
    setAmountCents(1000);
    setSpentAt(new Date().toISOString().slice(0, 10));
    setRoomId('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (amountCents <= 0) {
      showError('Please enter a valid expense amount');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          amount: amountCents,
          spentAt,
          roomId: roomId ? parseInt(roomId, 10) : null,
          note: note.trim() || null,
        }),
      });
      showSuccess('Expense recorded successfully');
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to record expense'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`expenses/${expenseToDelete.id}`, { method: 'DELETE' });
      showSuccess('Expense deleted');
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to delete expense'));
    } finally {
      setDeleting(false);
    }
  };

  // Helper for category stat
  const getCatAmount = (catKey) => {
    const item = summary.categories?.find((c) => c.category === catKey);
    return item ? item.totalAmount : 0;
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'repair':
        return <Wrench className="w-3.5 h-3.5 text-warning" />;
      case 'cleaning':
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
      case 'utilities':
        return <Zap className="w-3.5 h-3.5 text-info" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-content-muted" />;
    }
  };

  const tableColumns = [
    {
      key: 'spentAt',
      label: t('expenses.spentAt'),
      sortable: true,
      render: (e) => (
        <span className="text-xs font-mono font-medium text-content-secondary">
          {formatDate(e.spentAt, i18n.language)}
        </span>
      ),
    },
    {
      key: 'category',
      label: t('expenses.category'),
      render: (e) => (
        <div className="flex items-center gap-1.5">
          {getCategoryIcon(e.category)}
          <span className="capitalize font-medium text-xs text-content-primary">
            {t(`expenses.categories.${e.category}`, e.category)}
          </span>
        </div>
      ),
    },
    {
      key: 'roomNumber',
      label: t('expenses.room'),
      render: (e) =>
        e.roomNumber ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-content-primary">
            <Building2 className="w-3 h-3 text-content-muted" />
            #{e.roomNumber}
          </span>
        ) : (
          <span className="text-xs text-content-muted italic">Building-wide</span>
        ),
    },
    {
      key: 'note',
      label: t('expenses.note'),
      render: (e) => (
        <span className="text-xs text-content-secondary line-clamp-1">
          {e.note || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('expenses.amount'),
      sortable: true,
      render: (e) => (
        <div>
          <span className="font-mono font-bold text-sm text-danger">
            -{formatMoney(e.amount)}
          </span>
          <div className="text-[10px] text-content-muted font-mono">
            {formatMoney(e.amount, { showRiel: true })}
          </div>
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            label: t('common.actions'),
            render: (e) => (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => setExpenseToDelete(e)}
                className="text-danger hover:bg-danger-bg"
              >
                {t('common.delete')}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        action={
          isStaff && (
            <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
              {t('expenses.recordExpense')}
            </Button>
          )
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('expenses.totalSpent')}
          value={formatMoney(summary.totalSpent)}
          subtitle={month !== 'all' ? `For ${month}` : 'All time'}
          icon={TrendingDown}
          variant="danger"
        />
        <StatCard
          title={t('expenses.categories.repair')}
          value={formatMoney(getCatAmount('repair'))}
          subtitle="Maintenance & fixtures"
          icon={Wrench}
        />
        <StatCard
          title={t('expenses.categories.utilities')}
          value={formatMoney(getCatAmount('utilities'))}
          subtitle="Electricity, water, trash"
          icon={Zap}
        />
        <StatCard
          title={t('expenses.categories.cleaning')}
          value={formatMoney(getCatAmount('cleaning'))}
          subtitle="Cleaning & supplies"
          icon={Sparkles}
        />
      </div>

      {/* Filter Row: Month picker + Category Tabs */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-content-muted" />
          <input
            type="month"
            value={month === 'all' ? '' : month}
            onChange={(e) => {
              setMonth(e.target.value || 'all');
              setPage(1);
            }}
            className="text-xs font-mono bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {month !== 'all' && (
            <button
              onClick={() => {
                setMonth('all');
                setPage(1);
              }}
              className="text-xs text-content-muted hover:text-content-primary underline"
            >
              All Months
            </button>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'all', label: t('common.all') },
            { id: 'repair', label: t('expenses.categories.repair') },
            { id: 'cleaning', label: t('expenses.categories.cleaning') },
            { id: 'utilities', label: t('expenses.categories.utilities') },
            { id: 'other', label: t('expenses.categories.other') },
          ]}
          activeTab={categoryFilter}
          onChange={(tab) => {
            setCategoryFilter(tab);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={tableColumns}
        data={expenses}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={t('expenses.recordExpense')}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveExpense}
              loading={submitting}
            >
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <Select
            label={t('expenses.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'repair', label: t('expenses.categories.repair') },
              { value: 'cleaning', label: t('expenses.categories.cleaning') },
              { value: 'utilities', label: t('expenses.categories.utilities') },
              { value: 'other', label: t('expenses.categories.other') },
            ]}
          />

          <MoneyInput
            label={t('expenses.amount')}
            cents={amountCents}
            onChange={(c) => setAmountCents(c)}
            required
          />

          <DatePicker
            label={t('expenses.spentAt')}
            value={spentAt}
            onChange={(d) => setSpentAt(d)}
            required
          />

          <Select
            label={t('expenses.room')}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            options={[
              { value: '', label: 'Building-wide (No specific room)' },
              ...rooms.map((r) => ({
                value: String(r.id),
                label: `Room #${r.roomNumber} (Floor ${r.floor})`,
              })),
            ]}
          />

          <Input
            label={t('expenses.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Replaced water valve on 2nd floor"
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        onClose={() => !deleting && setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title={t('expenses.confirmDelete')}
        message={t('expenses.confirmDeleteDesc')}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
