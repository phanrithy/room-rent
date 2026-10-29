import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History,
  Shield,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Database,
  ArrowRight,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { SearchBox } from '../components/common/SearchBox.jsx';
import { Select } from '../components/common/Select.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Card } from '../components/common/Card.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../utils/api.js';

export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '25',
      });
      if (tableFilter !== 'all') queryParams.append('tableName', tableFilter);
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());

      const data = await apiRequest(`audit-logs?${queryParams.toString()}`);
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      showError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, tableFilter, searchQuery, showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action) => {
    let colorClass = 'bg-primary-bg text-primary border-primary-border';
    if (action.includes('CREATE') || action.includes('IMPORT') || action.includes('ADD')) {
      colorClass = 'bg-success-bg text-success border-success-border';
    } else if (action.includes('DELETE') || action.includes('END')) {
      colorClass = 'bg-danger-bg text-danger border-danger-border';
    } else if (action.includes('UPDATE') || action.includes('PATCH')) {
      colorClass = 'bg-info-bg text-info border-info-border';
    } else if (action.includes('RESTORE')) {
      colorClass = 'bg-warning-bg text-warning border-warning-border';
    }

    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${colorClass}`}
      >
        {action}
      </span>
    );
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      sortable: true,
      render: (log) => {
        const d = new Date(log.createdAt);
        const formatted = isNaN(d.getTime())
          ? log.createdAt
          : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        return (
          <span className="font-mono text-xs text-content-secondary whitespace-nowrap">
            {formatted}
          </span>
        );
      },
    },
    {
      key: 'username',
      label: 'User',
      render: (log) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-content-muted" />
          <span className="text-xs font-semibold text-content-primary">
            {log.username || 'System'}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (log) => getActionBadge(log.action),
    },
    {
      key: 'tableName',
      label: 'Table',
      render: (log) => (
        <code className="bg-surface-subtle border border-border px-1.5 py-0.5 rounded text-[11px] font-mono text-content-primary">
          {log.tableName}
        </code>
      ),
    },
    {
      key: 'recordId',
      label: 'Record #',
      render: (log) => (
        <span className="font-mono text-xs text-content-muted">
          {log.recordId ? `#${log.recordId}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Details',
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Eye}
          onClick={() => setSelectedLog(log)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs & System Trail"
        subtitle="Immutable security log of changes, transactions, and user operations"
      />

      {/* Control row: Table Filter + Search */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-content-muted" />
          <div className="w-44">
            <Select
              value={tableFilter}
              onChange={(e) => {
                setTableFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Tables' },
                { value: 'rooms', label: 'Rooms' },
                { value: 'tenants', label: 'Tenants' },
                { value: 'contracts', label: 'Contracts' },
                { value: 'meter_readings', label: 'Meter Readings' },
                { value: 'invoices', label: 'Invoices' },
                { value: 'payments', label: 'Payments' },
                { value: 'expenses', label: 'Expenses' },
                { value: 'users', label: 'Users' },
                { value: 'documents', label: 'Documents' },
                { value: 'properties', label: 'Properties' },
                { value: 'settings', label: 'Settings' },
                { value: 'database', label: 'Database' },
              ]}
            />
          </div>
        </div>

        <div className="w-64">
          <SearchBox
            value={searchQuery}
            onChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            placeholder="Search action or user..."
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={logs}
        total={total}
        page={page}
        pageSize={25}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Detail JSON Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event #${selectedLog?.id}: ${selectedLog?.action}`}
        maxWidth="max-w-xl"
        footer={
          <Button variant="secondary" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-surface-subtle p-3 rounded-xl border border-border">
              <div>
                <span className="text-content-muted block">Timestamp:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {selectedLog.createdAt}
                </span>
              </div>
              <div>
                <span className="text-content-muted block">User:</span>
                <span className="font-semibold text-content-primary">
                  {selectedLog.username || 'System'}
                </span>
              </div>
              <div>
                <span className="text-content-muted block">Target Table:</span>
                <code className="font-mono text-content-primary">
                  {selectedLog.tableName}
                </code>
              </div>
              <div>
                <span className="text-content-muted block">Record ID:</span>
                <span className="font-mono font-semibold text-content-primary">
                  {selectedLog.recordId || 'None'}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-content-primary block mb-1">
                Event Payload / Detail:
              </span>
              <pre className="bg-surface-subtle border border-border rounded-xl p-3 font-mono text-[11px] overflow-x-auto text-content-primary leading-relaxed">
                {selectedLog.detail
                  ? JSON.stringify(selectedLog.detail, null, 2)
                  : 'No extra details recorded'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
