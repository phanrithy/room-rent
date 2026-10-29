import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Building2,
  DoorOpen,
  DollarSign,
  QrCode,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Input } from '../common/Input.jsx';
import { Select } from '../common/Select.jsx';
import { MoneyInput } from '../common/MoneyInput.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiRequest } from '../../utils/api.js';

export function OnboardingWizardModal({ isOpen, onClose, onComplete }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [buildingName, setBuildingName] = useState('Sunrise Apartments');
  const [buildingAddress, setBuildingAddress] = useState('Street 271, Phnom Penh, Cambodia');
  const [numberOfRooms, setNumberOfRooms] = useState('8');
  const [floorsCount, setFloorsCount] = useState('2');
  const [defaultRentCents, setDefaultRentCents] = useState(15000); // $150.00
  const [electricPrice, setElectricPrice] = useState('150'); // 150 cents = $1.50
  const [waterPrice, setWaterPrice] = useState('50'); // 50 cents = $0.50
  const [dueDay, setDueDay] = useState('5');
  const [bakongAccountId, setBakongAccountId] = useState('landlord@devb');
  const [merchantName, setMerchantName] = useState('Sunrise Apartments');
  const [merchantCity, setMerchantCity] = useState('Phnom Penh');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('system');
  const [loadDemoData, setLoadDemoData] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest('settings/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          buildingName,
          buildingAddress,
          numberOfRooms,
          floorsCount,
          defaultRentCents,
          electricPrice,
          waterPrice,
          dueDay,
          bakongAccountId,
          merchantName,
          merchantCity,
          language,
          theme,
          loadDemoData,
        }),
      });

      showSuccess(loadDemoData ? 'Demo data loaded successfully!' : 'Setup completed successfully!');
      if (onComplete) onComplete();
      onClose();
    } catch (err) {
      showError(err.message || 'Onboarding setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Building Onboarding Setup (Step ${step} of 4)`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-content-muted border-b border-border pb-3 px-1">
          <span className={step >= 1 ? 'text-primary font-bold' : ''}>1. Building</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className={step >= 2 ? 'text-primary font-bold' : ''}>2. Rooms</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className={step >= 3 ? 'text-primary font-bold' : ''}>3. Pricing & Due Day</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className={step >= 4 ? 'text-primary font-bold' : ''}>4. KHQR & Finish</span>
        </div>

        {/* Step 1: Building Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Building & Property Information
            </h3>
            <Input
              label="Building Name"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              required
            />
            <Input
              label="Address / Location in Cambodia"
              value={buildingAddress}
              onChange={(e) => setBuildingAddress(e.target.value)}
              required
            />
          </div>
        )}

        {/* Step 2: Rooms Bulk Setup */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-primary" />
              Rooms & Floors Setup
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Number of Rooms"
                type="number"
                min="1"
                max="50"
                value={numberOfRooms}
                onChange={(e) => setNumberOfRooms(e.target.value)}
                helperText="Will be created automatically (e.g. 101, 102...)"
              />
              <Input
                label="Number of Floors"
                type="number"
                min="1"
                max="10"
                value={floorsCount}
                onChange={(e) => setFloorsCount(e.target.value)}
              />
            </div>
            <MoneyInput
              label="Default Monthly Rent ($)"
              value={defaultRentCents}
              onChange={(c) => setDefaultRentCents(c)}
              helperText="Default price assigned to created rooms"
            />
          </div>
        )}

        {/* Step 3: Utility Prices & Billing */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Utility Rates & Billing Day
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput
                label="Electricity Rate ($/kWh)"
                value={parseInt(electricPrice, 10)}
                onChange={(c) => setElectricPrice(String(c))}
                helperText="Standard rate per unit"
              />
              <MoneyInput
                label="Water Rate ($/m³)"
                value={parseInt(waterPrice, 10)}
                onChange={(c) => setWaterPrice(String(c))}
                helperText="Standard rate per unit"
              />
            </div>
            <Input
              label="Monthly Invoice Due Day"
              type="number"
              min="1"
              max="28"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              helperText="Day of each following month invoices are due (default: 5)"
            />
          </div>
        )}

        {/* Step 4: KHQR & Finish */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Bakong KHQR Account & Demo Options
            </h3>
            <Input
              label="Bakong Account ID / Mobile"
              value={bakongAccountId}
              onChange={(e) => setBakongAccountId(e.target.value)}
              placeholder="landlord@devb or 012345678@devb"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Merchant Name"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
              <Input
                label="Merchant City"
                value={merchantCity}
                onChange={(e) => setMerchantCity(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-border">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-surface-subtle cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={loadDemoData}
                  onChange={(e) => setLoadDemoData(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <div>
                  <span className="text-xs font-bold text-content-primary block">
                    Load Pre-configured Demo Data
                  </span>
                  <span className="text-[11px] text-content-muted block">
                    Seeds 8 demo rooms, 5 tenants, contracts, 2 months of readings and invoices.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
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
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              icon={ChevronRight}
              iconPosition="right"
              onClick={() => setStep((s) => s + 1)}
            >
              {t('common.next')}
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={handleSubmit}
              loading={loading}
            >
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
