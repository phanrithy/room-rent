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
  FileText,
  Copy,
  Check,
  Send,
  ExternalLink,
  Clock,
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
import { DocumentsModal } from '../components/modals/DocumentsModal.jsx';
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

  // Quick Inline Tenant Creation in Wizard
  const [isQuickTenantModalOpen, setIsQuickTenantModalOpen] = useState(false);
  const [quickTenantName, setQuickTenantName] = useState('');
  const [quickTenantPhone, setQuickTenantPhone] = useState('');
  const [quickTenantIdNumber, setQuickTenantIdNumber] = useState('');
  const [quickTenantEmail, setQuickTenantEmail] = useState('');
  const [quickTenantTelegram, setQuickTenantTelegram] = useState('');
  const [quickTenantSubmitting, setQuickTenantSubmitting] = useState(false);

  // Post-Contract Tenant Credentials Modal
  const [createdTenantAccount, setCreatedTenantAccount] = useState(null);
  const [copiedTenantCreds, setCopiedTenantCreds] = useState(false);

  // Decline Application Modal State
  const [decliningApp, setDecliningApp] = useState(null);
  const [declineReason, setDeclineReason] = useState('បន្ទប់ត្រូវបានជួលរួចហើយ (Room already leased)');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [decliningSubmitting, setDecliningSubmitting] = useState(false);
  const [declineResultModal, setDeclineResultModal] = useState(null);
  const [copiedDeclineText, setCopiedDeclineText] = useState(false);

  // End Contract / Move-out Modal State
  const [endingContract, setEndingContract] = useState(null);
  const [contractForDocs, setContractForDocs] = useState(null);
  const [damageChargesCents, setDamageChargesCents] = useState(0);
  const [damageNote, setDamageNote] = useState('');
  const [settlementData, setSettlementData] = useState(null);
  const [endingSubmitting, setEndingSubmitting] = useState(false);

  // Pending QR Applications
  const [pendingApplications, setPendingApplications] = useState([]);

  const fetchPendingApplications = useCallback(async () => {
    try {
      const data = await apiRequest('applications/pending');
      setPendingApplications(data.items || []);
    } catch {
      // quiet fallback
    }
  }, []);

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
      fetchPendingApplications();
    } catch (err) {
      showError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showError, fetchPendingApplications]);

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
      return { rooms: roomsRes.items, tenants: tenantsRes.items };
    } catch (err) {
      showError('Failed to load rooms or tenants for wizard');
      return { rooms: [], tenants: [] };
    }
  };

  const openWizardWithApplicant = async (app) => {
    const { rooms } = await loadWizardDependencies();
    setSelectedRoomId(String(app.roomId));
    setSelectedTenantId(String(app.tenantId));
    
    // Find room to match rent
    const matchedRoom = rooms.find((r) => String(r.id) === String(app.roomId));
    const targetRent = app.monthlyRent || (matchedRoom ? matchedRoom.monthlyRent : 15000);
    setRentCents(targetRent);
    setDepositCents(targetRent);

    if (app.moveInDate) {
      setStartDate(app.moveInDate);
      const nextYear = new Date(app.moveInDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setEndDate(nextYear.toISOString().split('T')[0]);
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setEndDate(nextYear.toISOString().split('T')[0]);
    }

    setStep(3); // Jump directly to Terms & Deposit
    setWizardError('');
    setIsWizardOpen(true);
  };

  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!decliningApp) return;
    setDecliningSubmitting(true);
    const finalReason = declineReason === 'custom' ? customDeclineReason.trim() : declineReason;
    try {
      const res = await apiRequest(`applications/${decliningApp.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: finalReason }),
      });
      showSuccess(i18n.language === 'km' ? 'ពាក្យស្នើសុំត្រូវបានបដិសេធ & បានផ្ញើដំណឹងតាម Telegram' : 'Application declined & notice sent via Telegram');
      setDeclineResultModal({
        app: decliningApp,
        reason: finalReason,
        telegramSent: res.telegramSent,
        shareInfo: res.shareInfo,
      });
      setDecliningApp(null);
      setCustomDeclineReason('');
      fetchPendingApplications();
    } catch (err) {
      showError(err.message || 'Failed to decline application');
    } finally {
      setDecliningSubmitting(false);
    }
  };

  const handleRejectApplication = (app) => {
    setDecliningApp(app);
  };

  // Check URL params for direct action
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      const directRoomId = searchParams.get('roomId');
      const directTenantId = searchParams.get('tenantId');
      if (directRoomId && directTenantId) {
        openWizardWithApplicant({ roomId: directRoomId, tenantId: directTenantId });
      } else {
        openWizard(directRoomId);
      }
      searchParams.delete('action');
      searchParams.delete('roomId');
      searchParams.delete('tenantId');
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

  const handleQuickCreateTenant = async (e) => {
    e.preventDefault();
    if (!quickTenantName.trim()) {
      showError('Tenant full name is required');
      return;
    }
    if (!quickTenantPhone.trim()) {
      showError('Tenant phone number is required');
      return;
    }
    if (!quickTenantIdNumber.trim()) {
      showError('National ID or Passport number is required');
      return;
    }

    setQuickTenantSubmitting(true);
    try {
      const created = await apiRequest('tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: quickTenantName.trim(),
          phone: quickTenantPhone.trim(),
          idNumber: quickTenantIdNumber.trim(),
          email: quickTenantEmail.trim() || null,
          telegramChatId: quickTenantTelegram.trim() || null,
        }),
      });

      showSuccess(`Tenant ${created.name} added!`);
      // Reload tenants list for wizard
      const tenantsRes = await apiRequest('tenants?pageSize=100');
      setTenantsList(tenantsRes.items);
      // Auto select the new tenant
      setSelectedTenantId(String(created.id));
      setIsQuickTenantModalOpen(false);
      setStep(3); // advance directly to Terms & Deposit
    } catch (err) {
      showError(err.message || 'Failed to create tenant');
    } finally {
      setQuickTenantSubmitting(false);
    }
  };

  const handleWizardSubmit = async () => {
    setWizardSubmitting(true);
    setWizardError('');
    try {
      const res = await apiRequest('contracts', {
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
      if (res?.contract?.tenantAccount || res?.tenantAccount) {
        setCreatedTenantAccount(res.contract?.tenantAccount || res.tenantAccount);
      }
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
          <Button
            variant="ghost"
            size="sm"
            icon={FileText}
            onClick={() => setContractForDocs(c)}
          >
            Files
          </Button>
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

      {/* Pending Room Applications from Door QR */}
      {pendingApplications.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <Phone className="w-4 h-4" />
              <span>
                {i18n.language === 'km'
                  ? `ពាក្យស្នើសុំជួលតាម QR ដែលរង់ចាំការយល់ព្រម (${pendingApplications.length})`
                  : `Pending Room Applications (${pendingApplications.length})`}
              </span>
            </div>
            <span className="text-[11px] text-content-muted">
              {i18n.language === 'km' ? 'ស្កេនពីទ្វារបន្ទប់' : 'Scanned from Door QR'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingApplications.map((app) => (
              <div
                key={app.id}
                className="p-3.5 bg-surface border border-border rounded-xl space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-content-primary block">
                      Room #{app.roomNumber} (Floor {app.floor})
                    </span>
                    <span className="text-xs text-content-secondary font-medium">
                      {app.tenantName} • {app.tenantPhone}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-primary">
                    {formatMoney(app.monthlyRent)}/mo
                  </span>
                </div>

                <div className="text-[11px] text-content-muted space-y-1">
                  <div>
                    National ID / Passport:{' '}
                    <span className="font-mono font-medium text-content-secondary">
                      {app.tenantIdNumber || 'N/A'}
                    </span>
                  </div>
                  {app.telegramChatId && (
                    <div>
                      Telegram:{' '}
                      <span className="font-medium text-primary">
                        @{app.telegramChatId.replace('@', '')}
                      </span>
                    </div>
                  )}
                  {app.moveInDate && (
                    <div>
                      Target Move-in:{' '}
                      <span className="font-medium text-content-secondary">{app.moveInDate}</span>
                    </div>
                  )}
                  {app.idDocumentId && (
                    <div className="pt-1">
                      <a
                        href={`/api/documents/${app.idDocumentId}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View ID Card / Passport Photo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 text-xs"
                    onClick={() => openWizardWithApplicant(app)}
                  >
                    {i18n.language === 'km' ? 'យល់ព្រម & បង្កើតកិច្ចសន្យា' : 'Agree & Create Contract'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-danger hover:bg-danger-bg"
                    onClick={() => handleRejectApplication(app)}
                  >
                    {i18n.language === 'km' ? 'បដិសេធ' : 'Decline'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-sm font-semibold text-content-primary">
                  {t('contracts.step2Tenant')}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setQuickTenantName('');
                    setQuickTenantPhone('');
                    setQuickTenantIdNumber('');
                    setQuickTenantEmail('');
                    setQuickTenantTelegram('');
                    setIsQuickTenantModalOpen(true);
                  }}
                >
                  {i18n.language === 'km' ? '+ បង្កើតអ្នកជួលថ្មី' : '+ Create New Tenant'}
                </Button>
              </div>
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

      {/* Contract Documents Modal */}
      <DocumentsModal
        isOpen={!!contractForDocs}
        onClose={() => setContractForDocs(null)}
        contract={contractForDocs}
      />

      {/* Quick Inline Create Tenant Modal */}
      <Modal
        isOpen={isQuickTenantModalOpen}
        onClose={() => setIsQuickTenantModalOpen(false)}
        title={i18n.language === 'km' ? 'បង្កើតអ្នកជួលថ្មី' : 'Create New Tenant'}
        size="md"
      >
        <form onSubmit={handleQuickCreateTenant} className="space-y-4">
          <Input
            label={t('tenants.fullName')}
            placeholder="e.g. Sokha Chan"
            value={quickTenantName}
            onChange={(e) => setQuickTenantName(e.target.value)}
            required
          />
          <Input
            label={t('tenants.phone')}
            placeholder="e.g. 012345678"
            value={quickTenantPhone}
            onChange={(e) => setQuickTenantPhone(e.target.value)}
            required
          />
          <Input
            label={t('tenants.idNumber')}
            placeholder="e.g. ID01020304"
            value={quickTenantIdNumber}
            onChange={(e) => setQuickTenantIdNumber(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('tenants.email')}
              placeholder="tenant@example.com"
              value={quickTenantEmail}
              onChange={(e) => setQuickTenantEmail(e.target.value)}
            />
            <Input
              label={t('tenants.telegram')}
              placeholder="@username"
              value={quickTenantTelegram}
              onChange={(e) => setQuickTenantTelegram(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuickTenantModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={quickTenantSubmitting}
            >
              {t('common.save')} & Proceed
            </Button>
          </div>
        </form>
      </Modal>

      {/* Post-Contract Tenant Account Credentials Modal */}
      <Modal
        isOpen={!!createdTenantAccount}
        onClose={() => setCreatedTenantAccount(null)}
        title={
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>
              {i18n.language === 'km'
                ? 'កិច្ចសន្យាបានបង្កើត & គណនីអ្នកជួលរួចរាល់!'
                : 'Contract Created & Tenant Login Ready!'}
            </span>
          </div>
        }
        size="md"
      >
        {createdTenantAccount && (
          <div className="space-y-4">
            <p className="text-xs text-content-muted">
              {i18n.language === 'km'
                ? `កិច្ចសន្យាសម្រាប់បន្ទប់ ${createdTenantAccount.roomNumber} ជាមួយអ្នកជួល ${createdTenantAccount.name} ត្រូវបានបង្កើតដោយជោគជ័យ។ គណនីចូលប្រើប្រព័ន្ធរបស់គាត់៖`
                : `Contract for Room ${createdTenantAccount.roomNumber} with ${createdTenantAccount.name} has been activated. Tenant portal login details:`}
            </p>

            <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-semibold text-content-primary">
                  {createdTenantAccount.name} (Room {createdTenantAccount.roomNumber})
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                  {createdTenantAccount.isNew ? 'New Account' : 'Existing Account'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-content-muted block">Username / Phone:</span>
                  <span className="font-mono font-bold text-sm text-content-primary">
                    {createdTenantAccount.username}
                  </span>
                </div>
                <div>
                  <span className="text-content-muted block">Default Password:</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {createdTenantAccount.defaultPassword || '(Existing password)'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {i18n.language === 'km'
                    ? 'សារដំណឹងយល់ព្រម និងលេខកូដសម្ងាត់ត្រូវបានផ្ញើទៅ Telegram របស់អ្នកជួលដោយស្វ័យប្រវត្តិ។'
                    : 'Approval notice and login credentials dispatched via Telegram Bot.'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-border">
              {createdTenantAccount.directTelegramUrl && (
                <a
                  href={createdTenantAccount.directTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#229ED9] text-white hover:bg-[#1E88E5] transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Telegram</span>
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                icon={copiedTenantCreds ? Check : Copy}
                onClick={() => {
                  const msg = createdTenantAccount.shareText || `Sunrise Apartments - Room ${createdTenantAccount.roomNumber}\nTenant Portal Login:\nUsername: ${createdTenantAccount.username}\nPassword: ${createdTenantAccount.defaultPassword || '(your password)'}\nLogin Link: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(msg);
                  setCopiedTenantCreds(true);
                  showSuccess('Credentials copied! You can paste and send via Telegram or SMS.');
                  setTimeout(() => setCopiedTenantCreds(false), 2500);
                }}
              >
                {copiedTenantCreds ? 'Copied' : 'Copy for Telegram/SMS'}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCreatedTenantAccount(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Decline Application Modal */}
      <Modal
        isOpen={!!decliningApp}
        onClose={() => { setDecliningApp(null); setCustomDeclineReason(''); }}
        title={i18n.language === 'km' ? 'បដិសេធពាក្យស្នើសុំជួលបន្ទប់' : 'Decline Room Application'}
        size="md"
      >
        {decliningApp && (
          <form onSubmit={handleConfirmDecline} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border text-xs space-y-1.5">
              <div className="font-bold text-sm text-content-primary">
                Room #{decliningApp.roomNumber} • {decliningApp.tenantName}
              </div>
              <div className="text-content-muted">
                Phone: {decliningApp.tenantPhone} {decliningApp.telegramChatId ? `• Telegram: ${decliningApp.telegramChatId}` : ''}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-content-primary">
                {i18n.language === 'km' ? 'មូលហេតុនៃការបដិសេធ (Reason for Declining)' : 'Select Reason for Declining'}
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-content-primary text-xs outline-none focus:border-primary"
              >
                <option value="បន្ទប់ត្រូវបានជួលរួចហើយ (Room already leased)">
                  {i18n.language === 'km' ? 'បន្ទប់ត្រូវបានជួលរួចហើយ (Room already leased)' : 'Room already leased to another applicant'}
                </option>
                <option value="លក្ខខណ្ឌកក់ប្រាក់មិនត្រូវគ្នា (Deposit terms not agreed)">
                  {i18n.language === 'km' ? 'លក្ខខណ្ឌកក់ប្រាក់មិនត្រូវគ្នា (Deposit terms not agreed)' : 'Deposit or payment terms not agreed'}
                </option>
                <option value="ឯកសារមិនគ្រប់គ្រាន់ (Incomplete documents)">
                  {i18n.language === 'km' ? 'ឯកសារមិនគ្រប់គ្រាន់ (Incomplete documents)' : 'Incomplete ID or documents'}
                </option>
                <option value="custom">
                  {i18n.language === 'km' ? 'ផ្សេងៗ (បញ្ជាក់ផ្ទាល់ខ្លួន...)' : 'Other (Type custom reason...)'}
                </option>
              </select>
            </div>

            {declineReason === 'custom' && (
              <Input
                label={i18n.language === 'km' ? 'មូលហេតុជាក់លាក់' : 'Custom Reason'}
                placeholder="e.g. Move-in date not compatible"
                value={customDeclineReason}
                onChange={(e) => setCustomDeclineReason(e.target.value)}
                required
              />
            )}

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Send className="w-4 h-4 shrink-0 mt-0.5 text-[#229ED9]" />
              <span>
                {i18n.language === 'km'
                  ? 'ប្រព័ន្ធ Telegram Bot នឹងផ្ញើសារដំណឹងបដិសេធនេះដោយស្វ័យប្រវត្តិកាន់អ្នកជួលតាម Telegram។'
                  : 'Our Telegram Bot will automatically send this decline notice to the applicant.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setDecliningApp(null); setCustomDeclineReason(''); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                loading={decliningSubmitting}
                icon={Send}
              >
                {i18n.language === 'km' ? 'បដិសេធ & ផ្ញើដំណឹង Telegram' : 'Decline & Notify via Telegram'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Decline Result Modal */}
      <Modal
        isOpen={!!declineResultModal}
        onClose={() => setDeclineResultModal(null)}
        title={i18n.language === 'km' ? 'ដំណឹងបដិសេធតាម Telegram' : 'Decline Notice Dispatched'}
        size="md"
      >
        {declineResultModal && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-content-primary font-bold">
                <span className="text-danger font-black">Declined:</span>
                <span>Room #{declineResultModal.app.roomNumber} • {declineResultModal.app.tenantName}</span>
              </div>
              <p className="text-content-muted">
                Reason: <span className="font-medium text-content-secondary">{declineResultModal.reason}</span>
              </p>

              <div className="pt-2 border-t border-border">
                {declineResultModal.telegramSent ? (
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Automated message delivered to tenant via Telegram Bot!</span>
                  </div>
                ) : (
                  <div className="text-content-muted text-[11px] space-y-1">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold block">
                      ℹ️ Notice recorded in system.
                    </span>
                    <span>You can tap below to send the notice directly to the tenant's Telegram contact:</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-border">
              {declineResultModal.shareInfo?.directTelegramUrl && (
                <a
                  href={declineResultModal.shareInfo.directTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#229ED9] text-white hover:bg-[#1E88E5] transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Telegram Chat</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={copiedDeclineText ? Check : Copy}
                onClick={() => {
                  if (declineResultModal.shareInfo?.plainText) {
                    navigator.clipboard.writeText(declineResultModal.shareInfo.plainText);
                    setCopiedDeclineText(true);
                    showSuccess('Notice text copied to clipboard!');
                    setTimeout(() => setCopiedDeclineText(false), 2000);
                  }
                }}
              >
                {copiedDeclineText ? 'Copied' : 'Copy Notice Text'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setDeclineResultModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
