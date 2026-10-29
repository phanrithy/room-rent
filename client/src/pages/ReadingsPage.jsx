import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gauge,
  Save,
  Calendar,
  AlertCircle,
  Zap,
  Droplets,
  CheckCircle2,
  Lock,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { Card } from '../components/common/Card.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatMonth } from '../utils/format.js';

export function ReadingsPage() {
  const { t, i18n } = useTranslation();
  const { isStaff } = useAuth();
  const { showSuccess, showError } = useToast();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [sheet, setSheet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState({ electricPrice: 150, waterPrice: 50 });

  const inputRefs = useRef({});

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`readings/sheet?month=${month}`);
      setSheet(data.sheet || []);
      if (data.sheet?.[0]) {
        setPrices({
          electricPrice: data.sheet[0].electricPrice || 150,
          waterPrice: data.sheet[0].waterPrice || 50,
        });
      }
    } catch (err) {
      showError(err.message || 'Failed to load reading sheet');
    } finally {
      setLoading(false);
    }
  }, [month, showError]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const handleCurrentChange = (roomId, field, rawValue) => {
    const parsed = rawValue === '' ? null : parseInt(rawValue, 10);

    setSheet((prevSheet) =>
      prevSheet.map((row) => {
        if (row.roomId !== roomId) return row;

        const updated = {
          ...row,
          [field]: parsed,
        };

        const eCurr = updated.electricCurrent;
        const wCurr = updated.waterCurrent;

        let eUnits = 0;
        let wUnits = 0;
        let isInvalid = false;

        if (eCurr !== null && eCurr !== undefined && !isNaN(eCurr)) {
          if (eCurr < row.electricPrev) {
            isInvalid = true;
          } else {
            eUnits = eCurr - row.electricPrev;
          }
        }

        if (wCurr !== null && wCurr !== undefined && !isNaN(wCurr)) {
          if (wCurr < row.waterPrev) {
            isInvalid = true;
          } else {
            wUnits = wCurr - row.waterPrev;
          }
        }

        const estCost = eUnits * prices.electricPrice + wUnits * prices.waterPrice;

        return {
          ...updated,
          electricUnits: eUnits,
          waterUnits: wUnits,
          estimatedCost: estCost,
          isInvalid,
        };
      })
    );
  };

  const handleKeyDown = (e, rowIndex, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to water if on electric, or to next row
      if (fieldName === 'electricCurrent') {
        const nextInput = inputRefs.current[`${rowIndex}_waterCurrent`];
        if (nextInput) nextInput.focus();
      } else {
        const nextRowInput = inputRefs.current[`${rowIndex + 1}_electricCurrent`];
        if (nextRowInput) nextRowInput.focus();
      }
    }
  };

  const handleSaveAll = async () => {
    // Collect rows that have both electricCurrent and waterCurrent filled
    const rowsToSave = sheet.filter(
      (r) =>
        r.electricCurrent !== null &&
        r.electricCurrent !== undefined &&
        r.waterCurrent !== null &&
        r.waterCurrent !== undefined
    );

    if (rowsToSave.length === 0) {
      showError('Please enter at least one reading before saving.');
      return;
    }

    // Check for any invalid row
    const invalidRow = rowsToSave.find((r) => r.isInvalid);
    if (invalidRow) {
      showError(
        `Room ${invalidRow.roomNumber} has a reading lower than previous. Please fix highlighted errors.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        month,
        readings: rowsToSave.map((r) => ({
          roomId: r.roomId,
          roomNumber: r.roomNumber,
          electricPrev: r.electricPrev,
          electricCurrent: r.electricCurrent,
          waterPrev: r.waterPrev,
          waterCurrent: r.waterCurrent,
        })),
      };

      const res = await apiRequest('readings/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showSuccess(`Saved ${rowsToSave.length} readings for ${formatMonth(month, i18n.language)}`);
      setSheet(res.sheet);
    } catch (err) {
      showError(t(`errors.${err.code}`, err.message || 'Failed to save readings'));
    } finally {
      setSaving(false);
    }
  };

  const hasInvalidRows = sheet.some((r) => r.isInvalid);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('readings.title')}
        subtitle={t('readings.subtitle')}
        action={
          isStaff && (
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSaveAll}
              loading={saving}
              disabled={hasInvalidRows}
            >
              {t('readings.saveAll')}
            </Button>
          )
        }
      />

      {/* Control Bar: Month Picker & Price Rates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 shadow-xs">
        <div className="w-full sm:w-64">
          <DatePicker
            label={t('readings.enterForMonth')}
            mode="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-content-secondary">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning-bg border border-warning-border text-warning-text">
            <Zap className="w-4 h-4 text-warning" />
            <span>Electricity: {formatMoney(prices.electricPrice)}/kWh</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-info-bg border border-info-border text-info-text">
            <Droplets className="w-4 h-4 text-info" />
            <span>Water: {formatMoney(prices.waterPrice)}/m³</span>
          </div>
        </div>
      </div>

      {hasInvalidRows && (
        <div className="p-3.5 bg-danger-bg border border-danger-border rounded-xl text-xs text-danger-text font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t('readings.invalidValues')}</span>
        </div>
      )}

      {/* Spreadsheet-like Grid Table */}
      {loading ? (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <Skeleton height="h-10" />
          <Skeleton height="h-12" />
          <Skeleton height="h-12" />
          <Skeleton height="h-12" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm text-content-primary">
            <thead className="bg-surface-subtle text-content-secondary uppercase text-xs tracking-wider border-b border-border select-none font-semibold">
              <tr>
                <th className="px-4 py-3">{t('readings.room')}</th>
                <th className="px-4 py-3">{t('nav.tenants')}</th>
                {/* Electricity Group */}
                <th className="px-4 py-3 bg-warning-bg/40 text-warning-text border-l border-border">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Elec Prev</span>
                  </div>
                </th>
                <th className="px-4 py-3 bg-warning-bg/40 text-warning-text">
                  <span>Elec Curr</span>
                </th>
                <th className="px-4 py-3 bg-warning-bg/40 text-warning-text text-right">
                  <span>Elec Units</span>
                </th>
                {/* Water Group */}
                <th className="px-4 py-3 bg-info-bg/40 text-info-text border-l border-border">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Water Prev</span>
                  </div>
                </th>
                <th className="px-4 py-3 bg-info-bg/40 text-info-text">
                  <span>Water Curr</span>
                </th>
                <th className="px-4 py-3 bg-info-bg/40 text-info-text text-right">
                  <span>Water Units</span>
                </th>
                {/* Estimate */}
                <th className="px-4 py-3 text-right border-l border-border">
                  {t('readings.estCost')}
                </th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border font-medium">
              {sheet.map((row, index) => {
                const isInvalid = row.isInvalid;

                return (
                  <tr
                    key={row.roomId}
                    className={`transition-colors ${
                      isInvalid
                        ? 'bg-danger-bg/40 text-danger-text'
                        : row.isRecorded
                        ? 'bg-surface hover:bg-surface-hover/50'
                        : 'bg-surface hover:bg-surface-hover/50'
                    }`}
                  >
                    {/* Room */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-base text-content-primary">
                        #{row.roomNumber}
                      </span>
                      <span className="block text-[11px] text-content-muted">
                        Floor {row.floor}
                      </span>
                    </td>

                    {/* Tenant */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {row.tenantName ? (
                        <span className="font-semibold text-content-primary">
                          {row.tenantName}
                        </span>
                      ) : (
                        <span className="text-content-muted italic">No active tenant</span>
                      )}
                    </td>

                    {/* Electric Prev (Locked) */}
                    <td className="px-4 py-3 whitespace-nowrap border-l border-border bg-warning-bg/10">
                      <div className="flex items-center gap-1.5 text-content-muted font-mono">
                        <Lock className="w-3 h-3 opacity-60" />
                        <span>{row.electricPrev}</span>
                      </div>
                    </td>

                    {/* Electric Current (Input) */}
                    <td className="px-4 py-3 whitespace-nowrap bg-warning-bg/10">
                      <input
                        ref={(el) => (inputRefs.current[`${index}_electricCurrent`] = el)}
                        type="number"
                        min={row.electricPrev}
                        placeholder={String(row.electricPrev)}
                        value={row.electricCurrent ?? ''}
                        onChange={(e) =>
                          handleCurrentChange(row.roomId, 'electricCurrent', e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index, 'electricCurrent')}
                        disabled={!isStaff}
                        className={`w-24 h-9 px-2.5 font-mono text-sm bg-surface border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          row.electricCurrent !== null && row.electricCurrent < row.electricPrev
                            ? 'border-danger text-danger ring-2 ring-danger/30'
                            : 'border-border'
                        }`}
                      />
                    </td>

                    {/* Electric Units */}
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold bg-warning-bg/10 text-warning-text">
                      {row.electricUnits} kWh
                    </td>

                    {/* Water Prev (Locked) */}
                    <td className="px-4 py-3 whitespace-nowrap border-l border-border bg-info-bg/10">
                      <div className="flex items-center gap-1.5 text-content-muted font-mono">
                        <Lock className="w-3 h-3 opacity-60" />
                        <span>{row.waterPrev}</span>
                      </div>
                    </td>

                    {/* Water Current (Input) */}
                    <td className="px-4 py-3 whitespace-nowrap bg-info-bg/10">
                      <input
                        ref={(el) => (inputRefs.current[`${index}_waterCurrent`] = el)}
                        type="number"
                        min={row.waterPrev}
                        placeholder={String(row.waterPrev)}
                        value={row.waterCurrent ?? ''}
                        onChange={(e) =>
                          handleCurrentChange(row.roomId, 'waterCurrent', e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index, 'waterCurrent')}
                        disabled={!isStaff}
                        className={`w-24 h-9 px-2.5 font-mono text-sm bg-surface border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          row.waterCurrent !== null && row.waterCurrent < row.waterPrev
                            ? 'border-danger text-danger ring-2 ring-danger/30'
                            : 'border-border'
                        }`}
                      />
                    </td>

                    {/* Water Units */}
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold bg-info-bg/10 text-info-text">
                      {row.waterUnits} m³
                    </td>

                    {/* Cost Estimate */}
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold border-l border-border text-content-primary">
                      {formatMoney(row.estimatedCost)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {row.isRecorded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                          <CheckCircle2 className="w-3 h-3" />
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs text-content-muted">Draft</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
