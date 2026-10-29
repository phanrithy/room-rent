import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Phone,
  Mail,
  CreditCard,
  FileText,
  UserCheck,
  Edit,
  Trash2,
  ExternalLink,
  DoorOpen,
  Calendar,
  Languages,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { IconButton } from '../components/common/IconButton.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { SearchBox } from '../components/common/SearchBox.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Drawer } from '../components/common/Drawer.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Avatar } from '../components/common/Avatar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function TenantsPage() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIdNumber, setFormIdNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelegram, setFormTelegram] = useState('');
  const [formLanguage, setFormLanguage] = useState('km');
  const [formError, setFormError] = useState('');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());

      const data = await apiRequest(`tenants?${queryParams.toString()}`);
      setTenants(data.items);
      setTotal(data.total);
    } catch (err) {
      showError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, showError]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const fetchTenantDetail = async (id) => {
    try {
      const data = await apiRequest(`tenants/${id}`);
      setSelectedTenantDetail(data.tenant);
    } catch (err) {
      showError(err.message || 'Failed to load tenant details');
    }
  };

  const openAddModal = () => {
    setEditingTenant(null);
    setFormName('');
    setFormPhone('');
    setFormIdNumber('');
    setFormEmail('');
    setFormTelegram('');
    setFormLanguage('km');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormName(tenant.name);
    setFormPhone(tenant.phone);
    setFormIdNumber(tenant.idNumber || '');
    setFormEmail(tenant.email || '');
    setFormTelegram(tenant.telegramChatId || '');
    setFormLanguage(tenant.language || 'km');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Name and phone number are required');
      return;
    }
    setFormSubmitting(true);
    setFormError('');

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      idNumber: formIdNumber.trim() || null,
      email: formEmail.trim() || null,
      telegramChatId: formTelegram.trim() || null,
      language: formLanguage,
    };

    try {
      if (editingTenant) {
        await apiRequest(`tenants/${editingTenant.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showSuccess(`Tenant ${formName} updated successfully`);
      } else {
        await apiRequest('tenants', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showSuccess(`Tenant ${formName} added successfully`);
      }
      setIsAddModalOpen(false);
      fetchTenants();
      if (selectedTenantDetail && selectedTenantDetail.id === editingTenant?.id) {
        fetchTenantDetail(selectedTenantDetail.id);
      }
    } catch (err) {
      setFormError(t(`errors.${err.code}`, err.message || 'Operation failed'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTenant) return;
    try {
      await apiRequest(`tenants/${deletingTenant.id}`, { method: 'DELETE' });
      showSuccess(`Tenant ${deletingTenant.name} deleted successfully`);
      setDeletingTenant(null);
      if (selectedTenantDetail?.id === deletingTenant.id) {
        setSelectedTenantDetail(null);
      }
      fetchTenants();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to delete tenant'));
    }
  };

  const activeLeaseCount = tenants.filter((t) => t.activeContractId).length;

  const tableColumns = [
    {
      key: 'name',
      label: t('tenants.fullName'),
      sortable: true,
      render: (tnt) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => fetchTenantDetail(tnt.id)}
        >
          <Avatar name={tnt.name} size="sm" />
          <div>
            <span className="font-semibold text-content-primary group-hover:text-primary transition-colors block">
              {tnt.name}
            </span>
            {tnt.idNumber && (
              <span className="text-[11px] text-content-muted block">{tnt.idNumber}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: t('tenants.phone'),
      render: (tnt) => (
        <a
          href={`tel:${tnt.phone}`}
          className="inline-flex items-center gap-1.5 font-mono text-content-secondary hover:text-primary transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-primary" />
          <span>{tnt.phone}</span>
        </a>
      ),
    },
    {
      key: 'activeRoom',
      label: t('nav.rooms'),
      render: (tnt) =>
        tnt.roomNumber ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary/20">
            <DoorOpen className="w-3 h-3" />
            Room #{tnt.roomNumber}
          </span>
        ) : (
          <span className="text-xs text-content-muted">No active lease</span>
        ),
    },
    {
      key: 'language',
      label: t('language.language'),
      render: (tnt) => (
        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded bg-surface-subtle border border-border text-content-secondary">
          {tnt.language === 'km' ? 'ភាសាខ្មែរ' : 'English'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (tnt) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTenantDetail(tnt.id)}
          >
            {t('common.details')}
          </Button>
          {isAdmin && (
            <>
              <IconButton
                icon={Edit}
                label={t('common.edit')}
                size="sm"
                onClick={() => openEditModal(tnt)}
              />
              {!tnt.activeContractId && (
                <IconButton
                  icon={Trash2}
                  label={t('common.delete')}
                  size="sm"
                  variant="danger"
                  onClick={() => setDeletingTenant(tnt)}
                />
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenants.title')}
        subtitle={t('tenants.subtitle')}
        action={
          isAdmin && (
            <Button variant="primary" icon={Plus} onClick={openAddModal}>
              {t('tenants.addTenant')}
            </Button>
          )
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Registered Tenants"
          value={total}
          subtitle="Tenant contacts directory"
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Currently Active Leases"
          value={activeLeaseCount}
          subtitle="Active residential contracts"
          icon={UserCheck}
          color="success"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex items-center justify-between gap-4">
        <SearchBox
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          placeholder="Search by tenant name, phone, or ID number..."
        />
      </div>

      {/* Tenants Table & Stacked Cards */}
      <DataTable
        columns={tableColumns}
        data={tenants}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Add / Edit Tenant Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingTenant ? t('tenants.editTenant') : t('tenants.addTenant')}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger-text text-xs font-semibold">
              {formError}
            </div>
          )}

          <Input
            label={t('tenants.fullName')}
            placeholder="e.g. Sokha Chan"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('tenants.phone')}
              placeholder="012 345 678"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              required
            />
            <Input
              label={t('tenants.idNumber')}
              placeholder="ID01020304"
              value={formIdNumber}
              onChange={(e) => setFormIdNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('tenants.email')}
              type="email"
              placeholder="name@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label={t('tenants.telegram')}
              placeholder="username or ID"
              value={formTelegram}
              onChange={(e) => setFormTelegram(e.target.value)}
            />
          </div>

          <Select
            label={t('tenants.preferredLanguage')}
            value={formLanguage}
            onChange={(e) => setFormLanguage(e.target.value)}
            options={[
              { value: 'km', label: 'ភាសាខ្មែរ (Khmer)' },
              { value: 'en', label: 'English' },
            ]}
            helperText="Invoice reminders and messages will be sent in this language"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" loading={formSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Tenant Detail Drawer */}
      <Drawer
        isOpen={!!selectedTenantDetail}
        onClose={() => setSelectedTenantDetail(null)}
        title="Tenant Profile & History"
      >
        {selectedTenantDetail && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-border">
              <Avatar name={selectedTenantDetail.name} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-content-primary">
                  {selectedTenantDetail.name}
                </h3>
                <p className="text-xs text-content-muted">
                  Registered {formatDate(selectedTenantDetail.createdAt, i18n.language)}
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-content-muted">{t('tenants.phone')}</span>
                <a
                  href={`tel:${selectedTenantDetail.phone}`}
                  className="font-mono font-medium text-primary hover:underline"
                >
                  {selectedTenantDetail.phone}
                </a>
              </div>

              {selectedTenantDetail.idNumber && (
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-content-muted">{t('tenants.idNumber')}</span>
                  <span className="font-mono font-medium text-content-primary">
                    {selectedTenantDetail.idNumber}
                  </span>
                </div>
              )}

              {selectedTenantDetail.email && (
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-content-muted">{t('tenants.email')}</span>
                  <a
                    href={`mailto:${selectedTenantDetail.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selectedTenantDetail.email}
                  </a>
                </div>
              )}

              {selectedTenantDetail.telegramChatId && (
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-xs text-content-muted">{t('tenants.telegram')}</span>
                  <span className="font-medium text-content-primary">
                    @{selectedTenantDetail.telegramChatId}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-content-muted">{t('tenants.preferredLanguage')}</span>
                <span className="font-medium text-content-primary uppercase">
                  {selectedTenantDetail.language === 'km' ? 'ភាសាខ្មែរ' : 'English'}
                </span>
              </div>
            </div>

            {/* Active Contract */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary mb-2">
                {t('tenants.activeContract')}
              </h4>
              {selectedTenantDetail.roomNumber ? (
                <div className="p-3.5 rounded-xl bg-primary-light border border-primary/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      Room #{selectedTenantDetail.roomNumber}
                    </span>
                    <StatusBadge status="active" size="sm" />
                  </div>
                  <p className="text-xs text-content-secondary">
                    {t('rooms.floorN', { floor: selectedTenantDetail.roomFloor })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-content-muted italic">No active lease at this time.</p>
              )}
            </div>

            {/* Invoices History */}
            {selectedTenantDetail.invoices?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary mb-2">
                  Recent Invoices ({selectedTenantDetail.invoices.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTenantDetail.invoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-content-primary block">
                          Month {inv.month}
                        </span>
                        <span className="text-content-muted">
                          {formatMoney(inv.total)}
                        </span>
                      </div>
                      <StatusBadge status={inv.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {isAdmin && (
              <div className="pt-4 border-t border-border flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditModal(selectedTenantDetail)}
                >
                  {t('common.edit')}
                </Button>
                {!selectedTenantDetail.activeContractId && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeletingTenant(selectedTenantDetail)}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTenant}
        onClose={() => setDeletingTenant(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete')}
        message={
          deletingTenant
            ? t('tenants.confirmDelete', { name: deletingTenant.name })
            : ''
        }
      />
    </div>
  );
}
