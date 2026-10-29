import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  DollarSign,
  TrendingDown,
  Trash2,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Select } from '../components/common/Select.jsx';
import { Input } from '../components/common/Input.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function MaintenancePage() {
  const { t, i18n } = useTranslation();
  const { isAdmin, isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Rooms for selector
  const [rooms, setRooms] = useState([]);

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [costCents, setCostCents] = useState(0);
  const [creating, setCreating] = useState(false);

  // Update Status / Finish Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editStatus, setEditStatus] = useState('open');
  const [editCostCents, setEditCostCents] = useState(0);
  const [createExpenseChecked, setCreateExpenseChecked] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchRooms = async () => {
    try {
      const data = await apiRequest('rooms?pageSize=100');
      setRooms(data.items || []);
    } catch {
      // ignore
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const data = await apiRequest(`maintenance?${queryParams.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      showError(err.message || 'Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showError]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!roomId) {
      showError('Please select a room');
      return;
    }
    if (!description.trim()) {
      showError('Please enter a description of the issue');
      return;
    }

    setCreating(true);
    try {
      await apiRequest('maintenance', {
        method: 'POST',
        body: JSON.stringify({
          roomId: parseInt(roomId, 10),
          description: description.trim(),
          cost: costCents,
        }),
      });
      showSuccess('Maintenance ticket created');
      setIsCreateOpen(false);
      setDescription('');
      setCostCents(0);
      fetchRequests();
    } catch (err) {
      showError(err.message || 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const openUpdateModal = (item) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditCostCents(item.cost || 0);
    setCreateExpenseChecked(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setUpdating(true);
    try {
      await apiRequest(`maintenance/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          cost: editCostCents,
          createExpense: editStatus === 'done' ? createExpenseChecked : false,
        }),
      });
      showSuccess('Maintenance ticket updated');
      setEditingItem(null);
      fetchRequests();
    } catch (err) {
      showError(err.message || 'Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const openCount = requests.filter((r) => r.status === 'open').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const doneCount = requests.filter((r) => r.status === 'done').length;

  const columns = [
    {
      key: 'roomNumber',
      label: 'Room',
      render: (item) => (
        <span className="font-bold text-xs text-content-primary inline-flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          #{item.roomNumber} (Floor {item.floor})
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Issue Description',
      render: (item) => (
        <div>
          <span className="font-medium text-xs text-content-primary block">
            {item.description}
          </span>
          <span className="text-[11px] text-content-muted">
            Reported: {formatDate(item.createdAt?.split('T')[0], i18n.language)}
            {item.tenantName && ` by ${item.tenantName}`}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-content-primary">
          {item.cost > 0 ? formatMoney(item.cost) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (item) =>
        isStaff ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openUpdateModal(item)}
          >
            Update
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance & Repairs"
        subtitle="Manage building repairs, tenant issue reports, and maintenance costs"
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsCreateOpen(true)}
          >
            Report Issue
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Open Requests"
          value={openCount}
          subtitle="Awaiting action"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Currently being fixed"
          icon={Clock}
          variant="primary"
        />
        <StatCard
          title="Completed"
          value={doneCount}
          subtitle="Repairs resolved"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Tabs */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs">
        <Tabs
          tabs={[
            { id: 'all', label: t('common.all') },
            { id: 'open', label: 'Open' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'done', label: 'Done' },
          ]}
          activeTab={statusFilter}
          onChange={(tab) => {
            setStatusFilter(tab);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={requests}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Create Maintenance Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Report Maintenance Issue"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSubmit}
              loading={creating}
            >
              Submit Ticket
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            options={[
              { value: '', label: 'Select Room...' },
              ...rooms.map((r) => ({
                value: String(r.id),
                label: `Room #${r.roomNumber} (Floor ${r.floor})`,
              })),
            ]}
            required
          />

          <Input
            label="Issue Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Air conditioner leaking water"
            required
          />

          {isStaff && (
            <MoneyInput
              label="Estimated Cost (Optional)"
              cents={costCents}
              onChange={(c) => setCostCents(c)}
            />
          )}
        </form>
      </Modal>

      {/* Update Maintenance Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Update Ticket #${editingItem?.id} - Room #${editingItem?.roomNumber}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setEditingItem(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateSubmit}
              loading={updating}
            >
              Update Ticket
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
          <p className="p-3 bg-surface-subtle border border-border rounded-lg text-content-primary">
            <span className="font-bold block mb-1">Issue:</span>
            {editingItem?.description}
          </p>

          <Select
            label="Status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            options={[
              { value: 'open', label: 'Open (Not started)' },
              { value: 'in_progress', label: 'In Progress (Work started)' },
              { value: 'done', label: 'Done (Resolved)' },
            ]}
          />

          <MoneyInput
            label="Repair Cost ($)"
            cents={editCostCents}
            onChange={(c) => setEditCostCents(c)}
          />

          {editStatus === 'done' && editCostCents > 0 && (
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={createExpenseChecked}
                onChange={(e) => setCreateExpenseChecked(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-content-primary font-medium">
                Automatically record as building expense under "Repair"
              </span>
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
