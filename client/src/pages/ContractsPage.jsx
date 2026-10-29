import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  FileSignature,
  Plus,
  DoorOpen,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Archive,
  Phone,
  ShieldCheck,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { IconButton } from '../components/common/IconButton.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

export function ContractsPage() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);

  // Wizard Form Fields
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [depositCents, setDepositCents] = useState(15000);
  const [rentCents, setRentCents] = useState(15000);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState('');

  // End Contract / Move-out Modal State
  const [endingContract, setEndingContract] = useState(null);
  const [damageChargesCents, setDamageChargesCents] = useState(0);
  const [damageNote, setDamageNote] = useState('');
  const [settlementData, setSettlementData] = useState(null);
  const [endingSubmitting, setEndingSubmitting] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const data = await apiRequest(`contracts?${queryParams.toString()}`);
      setContracts(data.items);
      setTotal(data.total);
    } catch (err) {
      showError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showError]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Load available rooms and tenants for wizard
  const loadWizardDependencies = async () => {
    try {
      const [roomsRes, tenantsRes] = await Promise.all([
        apiRequest('rooms?status=available&pageSize=100'),
        apiRequest('tenants?pageSize=100'),
      ]);
      setAvailableRooms(roomsRes.items);
      setTenantsList(tenantsRes.items);
    } catch (err) {
      showError('Failed to load rooms or tenants for wizard');
    }
  };

  // Check URL params for direct action
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      const directRoomId = searchParams.get('roomId');
      openWizard(directRoomId);
      searchParams.delete('action');
      searchParams.delete('roomId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const openWizard = async (preselectRoomId = null) => {
    await loadWizardDependencies();
    setStep(1);
    setWizardError('');
    setSelectedRoomId(preselectRoomId ? String(preselectRoomId) : '');
    setSelectedTenantId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().split('T')[0]);
    setIsWizardOpen(true);
  };

  // When room is selected in wizard, prefill rent and deposit
  const handleRoomSelect = (roomId) => {
    setSelectedRoomId(roomId);
    const room = availableRooms.find((r) => String(r.id) === String(roomId));
    if (room) {
      setRentCents(room.monthlyRent);
      setDepositCents(room.monthlyRent);
    }
  };

  const handleWizardSubmit = async () => {
    setWizardSubmitting(true);
    setWizardError('');
    try {
      await apiRequest('contracts', {
        method: 'POST',
        body: JSON.stringify({
          roomId: parseInt(selectedRoomId, 10),
          tenantId: parseInt(selectedTenantId, 10),
          startDate,
          endDate,
          deposit: depositCents,
          rentAmount: rentCents,
        }),
      });
      showSuccess(t('contracts.newContract') + ' created successfully!');
      setIsWizardOpen(false);
      fetchContracts();
    } catch (err) {
      setWizardError(t(`errors.${err.code}`, err.message || 'Failed to create contract'));
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Open End Contract / Move-out dialog
  const openEndContractDialog = async (contract) => {
    setEndingContract(contract);
    setDamageChargesCents(0);
    setDamageNote('');
    try {
      const data = await apiRequest(`contracts/${contract.id}/move-out?damageCharges=0`);
      setSettlementData(data.settlement);
    } catch (err) {
      showError(err.message || 'Failed to calculate move-out');
    }
  };

  // Recalculate move-out when damage charges change
  const handleDamageChargesChange = async (cents) => {
    setDamageChargesCents(cents);
    if (!endingContract) return;
    try {
      const data = await apiRequest(`contracts/${endingContract.id}/move-out?damageCharges=${cents}`);
      setSettlementData(data.settlement);
    } catch (err) {
      console.warn('Move-out calculation error:', err);
    }
  };

  const handleEndContractConfirm = async () => {
    if (!endingContract) return;
    setEndingSubmitting(true);
    try {
      const res = await apiRequest(`contracts/${endingContract.id}/end`, {
        method: 'POST',
        body: JSON.stringify({
          damageCharges: damageChargesCents,
          note: damageNote.trim() || null,
        }),
      });
      showSuccess(`Contract ended. Room #${endingContract.roomNumber} is now available.`);
      setEndingContract(null);
      setSettlementData(null);
      fetchContracts();
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to end contract'));
    } finally {
      setEndingSubmitting(false);
    }
  };

  const selectedRoomObj = availableRooms.find((r) => String(r.id) === String(selectedRoomId));
  const selectedTenantObj = tenantsList.find((t) => String(t.id) === String(selectedTenantId));

  const tableColumns = [
    {
      key: 'room',
      label: t('nav.rooms'),
      sortable: true,
      render: (c) => (
        <div>
          <span className="font-bold text-content-primary">Room #{c.roomNumber}</span>
          <span className="block text-xs text-content-muted">{t('rooms.floorN', { floor: c.floor })}</span>
        </div>
      ),
    },
    {
      key: 'tenant',
      label: t('nav.tenants'),
      sortable: true,
      render: (c) => (
        <div>
          <span className="font-medium text-content-primary">{c.tenantName}</span>
          <span className="block text-xs font-mono text-content-muted">{c.tenantPhone}</span>
        </div>
      ),
    },
    {
      key: 'period',
      label: 'Rental Period',
      render: (c) => (
        <div className="text-xs">
          <span className="text-content-primary font-medium">{formatDate(c.startDate, i18n.language)}</span>
          <span className="text-content-muted"> → </span>
          <span className="text-content-primary font-medium">{formatDate(c.endDate, i18n.language)}</span>
        </div>
      ),
    },
    {
      key: 'rent',
      label: t('contracts.rentAmount'),
      render: (c) => (
        <div>
          <span className="font-mono font-bold text-content-primary">{formatMoney(c.rentAmount)}</span>
          <span className="block text-[11px] text-content-muted">Deposit: {formatMoney(c.deposit)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.status === 'active' && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={Archive}
              onClick={() => openEndContractDialog(c)}
            >
              {t('contracts.endContract')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('contracts.title')}
        subtitle={t('contracts.subtitle')}
        action={
          isAdmin && (
            <Button variant="primary" icon={Plus} onClick={() => openWizard()}>
              {t('contracts.newContract')}
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex items-center justify-between">
        <Tabs
          tabs={[
            { id: 'active', label: t('status.active') },
            { id: 'ended', label: t('status.ended') },
            { id: 'all', label: t('common.all') },
          ]}
          activeTab={statusFilter}
          onChange={(tab) => {
            setStatusFilter(tab);
            setPage(1);
          }}
        />
      </div>

      {/* Contracts Table */}
      <DataTable
        columns={tableColumns}
        data={contracts}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Step-by-Step Contract Creation Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={`${t('contracts.wizardTitle')} (Step ${step} of 4)`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          {/* Progress Indicators */}
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-content-muted border-b border-border pb-3">
            <span className={step >= 1 ? 'text-primary font-bold' : ''}>1. Room</span>
            <ChevronRight className="w-4 h-4 opacity-40" />
            <span className={step >= 2 ? 'text-primary font-bold' : ''}>2. Tenant</span>
            <ChevronRight className="w-4 h-4 opacity-40" />
            <span className={step >= 3 ? 'text-primary font-bold' : ''}>3. Terms</span>
            <ChevronRight className="w-4 h-4 opacity-40" />
            <span className={step >= 4 ? 'text-primary font-bold' : ''}>4. Review</span>
          </div>

          {wizardError && (
            <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger-text text-xs font-semibold">
              {wizardError}
            </div>
          )}

          {/* Step 1: Choose Room */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">
                {t('contracts.step1Room')}
              </h3>
              {availableRooms.length === 0 ? (
                <div className="p-6 text-center text-content-muted bg-surface-subtle rounded-xl border border-border">
                  <DoorOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-content-primary">No available rooms right now</p>
                  <p className="text-xs mt-1">All rooms are currently occupied or under maintenance.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                  {availableRooms.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleRoomSelect(r.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        String(selectedRoomId) === String(r.id)
                          ? 'border-primary bg-primary-light shadow-xs ring-2 ring-primary/20'
                          : 'border-border bg-surface hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-content-primary">
                          #{r.roomNumber}
                        </span>
                        <span className="text-xs text-content-muted">Floor {r.floor}</span>
                      </div>
                      <div className="text-xs font-mono font-medium text-content-secondary mt-1">
                        {formatMoney(r.monthlyRent)}/mo
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Tenant */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">
                {t('contracts.step2Tenant')}
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {tenantsList.map((tnt) => (
                  <div
                    key={tnt.id}
                    onClick={() => setSelectedTenantId(String(tnt.id))}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      String(selectedTenantId) === String(tnt.id)
                        ? 'border-primary bg-primary-light shadow-xs ring-2 ring-primary/20'
                        : 'border-border bg-surface hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-content-primary">{tnt.name}</p>
                      <p className="text-xs font-mono text-content-muted">{tnt.phone}</p>
                    </div>
                    {tnt.roomNumber ? (
                      <span className="text-[11px] text-content-muted">
                        Active in #{tnt.roomNumber}
                      </span>
                    ) : (
                      <span className="text-[11px] text-success font-medium">Ready</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Terms & Deposit */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">
                {t('contracts.step3Terms')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  label={t('contracts.startDate')}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <DatePicker
                  label={t('contracts.endDate')}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MoneyInput
                  label={t('contracts.rentAmount')}
                  value={rentCents}
                  onChange={(cents) => setRentCents(cents)}
                  required
                  helperText="Agreed monthly rent amount"
                />
                <MoneyInput
                  label={t('contracts.deposit')}
                  value={depositCents}
                  onChange={(cents) => setDepositCents(cents)}
                  required
                  helperText="Refundable security deposit"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-content-primary">
                {t('contracts.step4Review')}
              </h3>

              <div className="bg-surface-subtle border border-border rounded-xl p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-content-muted">{t('nav.rooms')}</span>
                  <span className="font-bold text-content-primary">
                    Room #{selectedRoomObj?.roomNumber} (Floor {selectedRoomObj?.floor})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-content-muted">{t('nav.tenants')}</span>
                  <span className="font-bold text-content-primary">
                    {selectedTenantObj?.name} ({selectedTenantObj?.phone})
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-content-muted">Lease Period</span>
                  <span className="font-medium text-content-primary">
                    {startDate} → {endDate}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-content-muted">{t('contracts.rentAmount')}</span>
                  <span className="font-mono font-bold text-content-primary">
                    {formatMoney(rentCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-content-muted">{t('contracts.deposit')}</span>
                  <span className="font-mono font-bold text-content-primary">
                    {formatMoney(depositCents)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-primary-light border border-primary/20 rounded-lg text-xs text-primary leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Confirming this agreement will immediately mark Room #{selectedRoomObj?.roomNumber} as occupied.
                </span>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {step > 1 ? (
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setStep((s) => s - 1)}
              >
                {t('common.previous')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setIsWizardOpen(false)}>
                {t('common.cancel')}
              </Button>
            )}

            {step < 4 ? (
              <Button
                variant="primary"
                icon={ChevronRight}
                iconPosition="right"
                disabled={
                  (step === 1 && !selectedRoomId) ||
                  (step === 2 && !selectedTenantId)
                }
                onClick={() => setStep((s) => s + 1)}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleWizardSubmit}
                loading={wizardSubmitting}
              >
                {t('contracts.newContract')}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* End Contract / Move-out Settlement Modal */}
      <Modal
        isOpen={!!endingContract}
        onClose={() => setEndingContract(null)}
        title={t('contracts.endContract')}
        maxWidth="max-w-md"
      >
        {endingContract && settlementData && (
          <div className="space-y-4">
            <div className="p-3 bg-warning-bg border border-warning-border rounded-lg text-xs text-warning-text flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('contracts.endContractWarning')}</span>
            </div>

            {/* Financial breakdown */}
            <div className="bg-surface-subtle border border-border rounded-xl p-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-content-muted">{t('contracts.deposit')}</span>
                <span className="font-mono font-bold text-success">
                  +{formatMoney(settlementData.deposit)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-content-muted">Unpaid Invoices</span>
                <span className="font-mono font-bold text-danger">
                  -{formatMoney(settlementData.unpaidInvoicesSum)}
                </span>
              </div>

              <div>
                <MoneyInput
                  label="Damage / Cleaning Charges"
                  value={damageChargesCents}
                  onChange={handleDamageChargesChange}
                  placeholder="0.00"
                  helperText="Deducted directly from deposit balance"
                />
              </div>

              {/* Final Settlement Result */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-content-secondary block">
                    {settlementData.refund > 0
                      ? t('contracts.depositRefund')
                      : t('contracts.tenantOwes')}
                  </span>
                  <span className="text-[11px] text-content-muted">Net balance settlement</span>
                </div>
                <div
                  className={`font-mono font-black text-xl ${
                    settlementData.refund > 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {settlementData.refund > 0
                    ? formatMoney(settlementData.refund)
                    : formatMoney(settlementData.stillOwed)}
                </div>
              </div>
            </div>

            <Input
              label={t('common.note')}
              placeholder="Move-out inspection notes..."
              value={damageNote}
              onChange={(e) => setDamageNote(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setEndingContract(null)}
                disabled={endingSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleEndContractConfirm}
                loading={endingSubmitting}
              >
                {t('contracts.endContract')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
