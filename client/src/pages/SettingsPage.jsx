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
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { MoneyInput } from '../components/common/MoneyInput.jsx';
import { Card } from '../components/common/Card.jsx';
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
    } catch (err) {
      showError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [showError]);

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

      {/* 7. Setup & Tools */}
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
    </form>
  );
}
