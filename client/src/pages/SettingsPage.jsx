import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  DollarSign,
  QrCode,
  Calendar,
  Languages,
  Sun,
  Moon,
  Laptop,
  Save,
  Sparkles,
  Users,
  ShieldCheck,
  CheckCircle2,
  Database,
  Plus,
  Trash2,
  UserPlus,
  Download,
  Upload,
  Lock,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { Card } from '../components/common/Card.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { OnboardingWizardModal } from '../components/onboarding/OnboardingWizardModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { setAppLanguage } from '../i18n/index.js';
import { apiRequest } from '../utils/api.js';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, updatePreferences } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Grouped Settings State
  // 1. Building Info
  const [buildingName, setBuildingName] = useState('Sunrise Apartments');
  const [buildingAddress, setBuildingAddress] = useState('Street 271, Phnom Penh, Cambodia');

  // 2. Utility Pricing
  const [electricPrice, setElectricPrice] = useState(150); // cents
  const [waterPrice, setWaterPrice] = useState(50); // cents

  // 3. Billing Rules
  const [dueDay, setDueDay] = useState('5');
  const [lateFeeCents, setLateFeeCents] = useState(0);

  // 4. KHQR Configuration
  const [bakongAccountId, setBakongAccountId] = useState('landlord@devb');
  const [merchantName, setMerchantName] = useState('Sunrise Apartments');
  const [merchantCity, setMerchantCity] = useState('Phnom Penh');

  // 5. Reminders & Currency
  const [reminderDaysBefore, setReminderDaysBefore] = useState('3');
  const [exchangeRate, setExchangeRate] = useState('4100');

  // 6. User Preferences
  const [preferredLang, setPreferredLang] = useState(i18n.language || 'en');
  const [preferredTheme, setPreferredTheme] = useState(theme || 'system');

  // 7. Multi-Properties
  const [properties, setProperties] = useState([]);
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [propSubmitting, setPropSubmitting] = useState(false);

  // 8. Staff / Users
  const [usersList, setUsersList] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('staff');
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // 9. Backup / Restore
  const [restoring, setRestoring] = useState(false);

  const fetchPropertiesAndUsers = useCallback(async () => {
    try {
      const [propData, userData] = await Promise.all([
        apiRequest('properties'),
        apiRequest('users?pageSize=100'),
      ]);
      setProperties(propData.items || []);
      setUsersList(userData.items || []);
    } catch {
      // Ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('settings');
      const s = data.settings || {};
      const p = data.property || {};

      setBuildingName(p.name || s.company_name || 'Sunrise Apartments');
      setBuildingAddress(p.address || 'Street 271, Phnom Penh, Cambodia');
      setElectricPrice(parseInt(s.electric_price || '150', 10));
      setWaterPrice(parseInt(s.water_price || '50', 10));
      setDueDay(s.due_day || '5');
      setLateFeeCents(parseInt(s.late_fee || '0', 10));
      setBakongAccountId(s.bakong_account_id || 'landlord@devb');
      setMerchantName(s.merchant_name || 'Sunrise Apartments');
      setMerchantCity(s.merchant_city || 'Phnom Penh');
      setReminderDaysBefore(s.reminder_days_before || '3');
      setExchangeRate(s.exchange_rate || '4100');

      fetchPropertiesAndUsers();
    } catch (err) {
      showError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [fetchPropertiesAndUsers, showError]);

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newPropName.trim()) return;
    setPropSubmitting(true);
    try {
      await apiRequest('properties', {
        method: 'POST',
        body: JSON.stringify({ name: newPropName.trim(), address: newPropAddress.trim() }),
      });
      showSuccess('Property added successfully');
      setIsPropModalOpen(false);
      setNewPropName('');
      setNewPropAddress('');
      fetchPropertiesAndUsers();
    } catch (err) {
      showError(err.message || 'Failed to add property');
    } finally {
      setPropSubmitting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim()) return;
    setUserSubmitting(true);
    try {
      await apiRequest('users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      showSuccess(`Staff user ${newUsername} created`);
      setIsUserModalOpen(false);
      setNewUsername('');
      setNewUserPassword('');
      fetchPropertiesAndUsers();
    } catch (err) {
      showError(err.message || 'Failed to create user');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserActive = async (targetUser) => {
    try {
      await apiRequest(`users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !targetUser.active }),
      });
      showSuccess(`User ${targetUser.username} status updated`);
      fetchPropertiesAndUsers();
    } catch (err) {
      showError(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    try {
      await apiRequest(`users/${userToDelete.id}`, { method: 'DELETE' });
      showSuccess(`User ${userToDelete.username} deleted`);
      setUserToDelete(null);
      fetchPropertiesAndUsers();
    } catch (err) {
      showError(err.message || 'Failed to delete user');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem('app_token');
      const res = await fetch('/api/settings/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-rent-backup-${new Date().toISOString().slice(0, 10)}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showSuccess('Database backup downloaded');
    } catch (err) {
      showError(err.message || 'Download backup failed');
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('WARNING: Restoring will overwrite the current database! Continue?')) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('app_token');
      const res = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore database');
      showSuccess('Database restored successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showError(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        property: {
          name: buildingName.trim(),
          address: buildingAddress.trim(),
        },
        company_name: buildingName.trim(),
        electric_price: String(electricPrice),
        water_price: String(waterPrice),
        due_day: String(dueDay),
        late_fee: String(lateFeeCents),
        bakong_account_id: bakongAccountId.trim(),
        merchant_name: merchantName.trim(),
        merchant_city: merchantCity.trim(),
        reminder_days_before: String(reminderDaysBefore),
        exchange_rate: String(exchangeRate),
      };

      await apiRequest('settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Save user preference
      if (preferredLang !== i18n.language || preferredTheme !== theme) {
        await updatePreferences({
          language: preferredLang,
          theme: preferredTheme,
        });
      }

      showSuccess(t('common.saved'));
    } catch (err) {
      showError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-10" width="w-48" />
        <Skeleton height="h-64" />
        <Skeleton height="h-64" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-12">
      <PageHeader
        title={t('settings.title')}
        subtitle="Manage building details, utility tariffs, KHQR settings, and system preferences"
        action={
          <Button variant="primary" icon={Save} type="submit" loading={saving}>
            {t('common.save')}
          </Button>
        }
      />

      {/* 1. Building Information */}
      <Card
        title={t('settings.building')}
        subtitle="Property details shown on invoices, receipts, and headers"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Building / Apartment Name"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            required
          />
          <Input
            label="Street Address / City"
            value={buildingAddress}
            onChange={(e) => setBuildingAddress(e.target.value)}
            required
          />
        </div>
      </Card>

      {/* 2. Utility Pricing Rates */}
      <Card
        title={t('settings.pricing')}
        subtitle="Default rates per unit used to calculate electricity and water costs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyInput
            label={t('settings.electricPrice')}
            value={electricPrice}
            onChange={(c) => setElectricPrice(c)}
            required
            helperText="Stored in cents. Example: $1.50 per kWh"
          />
          <MoneyInput
            label={t('settings.waterPrice')}
            value={waterPrice}
            onChange={(c) => setWaterPrice(c)}
            required
            helperText="Stored in cents. Example: $0.50 per m³"
          />
        </div>
      </Card>

      {/* 3. Billing & Invoicing Rules */}
      <Card
        title="Billing & Due Date Rules"
        subtitle="Rules governing invoice due dates and overdue penalties"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('settings.dueDay')}
            type="number"
            min="1"
            max="28"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            required
            helperText="Day of following month (e.g. 5 = 5th of each month)"
          />
          <MoneyInput
            label={t('settings.lateFee')}
            value={lateFeeCents}
            onChange={(c) => setLateFeeCents(c)}
            helperText="One-time fee automatically added when an invoice becomes overdue"
          />
        </div>
      </Card>

      {/* 4. Bakong KHQR Settings */}
      <Card
        title={t('settings.khqr')}
        subtitle="National Bank of Cambodia KHQR dynamic payment settings"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Bakong Account ID"
            value={bakongAccountId}
            onChange={(e) => setBakongAccountId(e.target.value)}
            placeholder="e.g. landlord@devb"
            required
            helperText="Your official Bakong merchant or individual ID"
          />
          <Input
            label="Merchant Name"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            required
          />
          <Input
            label="Merchant City"
            value={merchantCity}
            onChange={(e) => setMerchantCity(e.target.value)}
            required
          />
        </div>
      </Card>

      {/* 5. Reminders & Exchange Rate */}
      <Card
        title="Reminders & Display Currency"
        subtitle="Khmer Riel conversion rate and automated message timelines"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Days Before Due to Send Reminder"
            type="number"
            min="1"
            max="14"
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(e.target.value)}
            helperText="Automated notice sent X days prior to due date"
          />
          <Input
            label={t('settings.exchangeRate')}
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            helperText="For display conversion on invoices (e.g. 4,100 KHR per USD)"
          />
        </div>
      </Card>

      {/* 6. Language & Theme Preferences */}
      <Card
        title="Language & Theme Preferences"
        subtitle="Default interface language and theme styling"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={t('language.language')}
            value={preferredLang}
            onChange={(e) => setPreferredLang(e.target.value)}
            options={[
              { value: 'en', label: 'English (US)' },
              { value: 'km', label: 'ភាសាខ្មែរ (Khmer)' },
            ]}
          />
          <Select
            label={t('theme.theme')}
            value={preferredTheme}
            onChange={(e) => setPreferredTheme(e.target.value)}
            options={[
              { value: 'system', label: t('theme.system') },
              { value: 'light', label: t('theme.light') },
              { value: 'dark', label: t('theme.dark') },
            ]}
          />
        </div>
      </Card>

      {/* 7. Properties Management */}
      <Card
        title="Buildings & Properties"
        subtitle="Manage multi-building residential properties"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => setIsPropModalOpen(true)}
          >
            Add Property
          </Button>
        }
      >
        <div className="space-y-3">
          {properties.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-subtle"
            >
              <div>
                <span className="font-semibold text-sm text-content-primary block">
                  {p.name}
                </span>
                <span className="text-xs text-content-secondary">{p.address}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-bg text-primary border border-primary-border">
                PROPERTY #{p.id}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* 8. Staff & User Access */}
      <Card
        title="Staff & User Management"
        subtitle="Manage administrative and staff accounts"
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={UserPlus}
            onClick={() => setIsUserModalOpen(true)}
          >
            Add Staff User
          </Button>
        }
      >
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-surface-subtle text-content-secondary border-b border-border">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-content-primary font-mono">
                    {u.username}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-primary-bg text-primary border border-primary-border'
                          : 'bg-info-bg text-info border border-info-border'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                        u.active ? 'bg-success' : 'bg-danger'
                      }`}
                    />
                    {u.active ? 'Active' : 'Disabled'}
                  </td>
                  <td className="px-3 py-2.5 text-right space-x-2">
                    {u.id !== user?.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          className="text-[11px] font-semibold text-content-secondary hover:text-content-primary underline"
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="text-[11px] font-semibold text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 9. Database Backup & Restore */}
      <Card
        title="Data Backup & Disaster Recovery"
        subtitle="Snapshot SQLite database or restore from an earlier backup"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            icon={Download}
            type="button"
            onClick={handleDownloadBackup}
          >
            Download SQLite Backup
          </Button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-xs font-semibold text-content-primary hover:bg-surface-subtle transition-colors shadow-xs">
            <Upload className="w-4 h-4 text-primary" />
            {restoring ? 'Restoring...' : 'Restore Database (.db)'}
            <input
              type="file"
              accept=".db,application/x-sqlite3"
              onChange={handleRestoreBackup}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>
      </Card>

      {/* 10. Setup & Tools */}
      <Card
        title="Setup & Maintenance Tools"
        subtitle="Quickly re-configure building parameters or re-seed data"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            icon={Sparkles}
            onClick={() => setIsOnboardingOpen(true)}
          >
            Launch Setup Wizard
          </Button>
        </div>
      </Card>

      {/* Submit button at bottom */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button variant="primary" size="lg" icon={Save} type="submit" loading={saving}>
          {t('common.save')}
        </Button>
      </div>

      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={fetchSettings}
      />

      {/* Add Property Modal */}
      <Modal
        isOpen={isPropModalOpen}
        onClose={() => setIsPropModalOpen(false)}
        title="Add New Building Property"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsPropModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProperty}
              loading={propSubmitting}
            >
              Add Property
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Property Name"
            value={newPropName}
            onChange={(e) => setNewPropName(e.target.value)}
            placeholder="e.g. Sunrise Apartments Annex"
            required
          />
          <Input
            label="Address"
            value={newPropAddress}
            onChange={(e) => setNewPropAddress(e.target.value)}
            placeholder="e.g. Street 155, Toul Tompoung, Phnom Penh"
          />
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Create Staff User"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              loading={userSubmitting}
            >
              Create User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="e.g. manager1"
            required
          />
          <Input
            label="Initial Password"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
          <Select
            label="Role"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            options={[
              { value: 'staff', label: 'Staff (Read & Operations)' },
              { value: 'admin', label: 'Admin (Full Access)' },
            ]}
          />
        </div>
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUserConfirm}
        title="Delete User"
        message={`Are you sure you want to permanently delete user "${userToDelete?.username}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </form>
  );
}
