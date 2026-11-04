import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatMonth, formatDate } from '../../utils/format.js';

const KHMER_MONTHS_SHORT = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

const ENGLISH_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const KHMER_WEEKDAYS = ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'];
const ENGLISH_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker = forwardRef(function DatePicker(
  {
    label,
    error,
    helperText,
    mode = 'date', // 'date' (YYYY-MM-DD) or 'month' (YYYY-MM)
    fullWidth = true,
    required = false,
    className = '',
    value,
    defaultValue,
    onChange,
    disabled = false,
    placeholder,
    name,
    id,
    ...props
  },
  ref
) {
  const { i18n } = useTranslation();
  const isKm = i18n.language === 'km';
  const containerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '');

  // Keep internal value in sync with external value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Determine current view year & month for calendar navigation
  const getInitialYear = () => {
    const v = internalValue || '';
    if (v.length >= 4) {
      const y = parseInt(v.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  };

  const getInitialMonth = () => {
    const v = internalValue || '';
    if (v.length >= 7) {
      const m = parseInt(v.slice(5, 7), 10) - 1;
      if (!isNaN(m) && m >= 0 && m < 12) return m;
    }
    return new Date().getMonth();
  };

  const [viewYear, setViewYear] = useState(getInitialYear);
  const [viewMonth, setViewMonth] = useState(getInitialMonth);

  // Update view navigation when popover opens
  useEffect(() => {
    if (isOpen) {
      setViewYear(getInitialYear());
      setViewMonth(getInitialMonth());
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Trigger change handler
  const emitChange = (newVal) => {
    setInternalValue(newVal);
    if (onChange) {
      onChange({
        target: {
          value: newVal,
          name: name || id,
        },
      });
    }
  };

  // Month mode selection
  const handleSelectMonth = (monthIdx) => {
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    const newVal = `${viewYear}-${monthStr}`;
    emitChange(newVal);
    setIsOpen(false);
  };

  // Date mode selection
  const handleSelectDay = (day) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newVal = `${viewYear}-${monthStr}-${dayStr}`;
    emitChange(newVal);
    setIsOpen(false);
  };

  // Clear action
  const handleClear = () => {
    emitChange('');
    setIsOpen(false);
  };

  // Today / This month action
  const handleCurrent = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    if (mode === 'month') {
      emitChange(`${y}-${m}`);
    } else {
      const d = String(now.getDate()).padStart(2, '0');
      emitChange(`${y}-${m}-${d}`);
    }
    setIsOpen(false);
  };

  // Calculate days in viewMonth of viewYear for date mode
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  // Format label text in trigger
  const displayValue = () => {
    if (!internalValue) return '';
    if (mode === 'month') {
      return formatMonth(internalValue, i18n.language);
    }
    return formatDate(internalValue, i18n.language);
  };

  const monthsList = isKm ? KHMER_MONTHS_SHORT : ENGLISH_MONTHS_SHORT;
  const weekdaysList = isKm ? KHMER_WEEKDAYS : ENGLISH_WEEKDAYS;

  // Real-world today for indicator
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}
    >
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-content-secondary flex items-center gap-1">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div className="relative flex items-center">
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`h-11 pl-10 pr-3.5 bg-surface text-content-primary border rounded-md transition-colors text-sm w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-surface-subtle disabled:opacity-60 ${
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : isOpen
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-border-strong'
          } ${className}`}
        >
          <span className={displayValue() ? 'text-content-primary font-medium' : 'text-content-muted'}>
            {displayValue() || placeholder || (isKm ? 'ជ្រើសរើស...' : 'Select...')}
          </span>

          <Calendar className="w-4 h-4 text-content-muted shrink-0" />
        </button>

        <div className="absolute left-3 text-content-muted pointer-events-none">
          <Calendar className="w-5 h-5" />
        </div>
      </div>

      {error && <p className="text-xs text-danger font-medium mt-0.5">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-content-muted mt-0.5">{helperText}</p>
      )}

      {/* Bilingual Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border shadow-xl rounded-2xl p-3.5 w-72 text-content-primary animate-in fade-in zoom-in-95 duration-100 select-none">
          {/* Header with Year / Month navigation */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
            <button
              type="button"
              onClick={() => {
                if (mode === 'month') {
                  setViewYear((y) => y - 1);
                } else {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else {
                    setViewMonth((m) => m - 1);
                  }
                }
              }}
              className="p-1 rounded-lg hover:bg-surface-subtle text-content-secondary hover:text-content-primary transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-sm text-content-primary">
              {mode === 'month' ? (
                isKm ? `ឆ្នាំ ${viewYear}` : `Year ${viewYear}`
              ) : (
                isKm
                  ? `${KHMER_MONTHS_SHORT[viewMonth]} ${viewYear}`
                  : `${ENGLISH_MONTHS_SHORT[viewMonth]} ${viewYear}`
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                if (mode === 'month') {
                  setViewYear((y) => y + 1);
                } else {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else {
                    setViewMonth((m) => m + 1);
                  }
                }
              }}
              className="p-1 rounded-lg hover:bg-surface-subtle text-content-secondary hover:text-content-primary transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* MONTH MODE: 4x3 Grid */}
          {mode === 'month' && (
            <div className="grid grid-cols-3 gap-1.5 py-1">
              {monthsList.map((monthName, mIdx) => {
                const monthStr = String(mIdx + 1).padStart(2, '0');
                const isSelected = internalValue === `${viewYear}-${monthStr}`;
                const isCurrent =
                  todayYear === viewYear && todayMonth === mIdx;

                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => handleSelectMonth(mIdx)}
                    className={`py-2 px-1 text-xs rounded-xl font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : isCurrent
                        ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                        : 'hover:bg-surface-subtle text-content-primary'
                    }`}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          )}

          {/* DATE MODE: 7-column Calendar Grid */}
          {mode === 'date' && (
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-content-muted mb-1">
                {weekdaysList.map((w, idx) => (
                  <span key={idx} className="py-0.5">
                    {w}
                  </span>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Empty padding for days before 1st of month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`pad-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const monthStr = String(viewMonth + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const dayValue = `${viewYear}-${monthStr}-${dayStr}`;
                  const isSelected = internalValue === dayValue;
                  const isCurrent =
                    todayYear === viewYear &&
                    todayMonth === viewMonth &&
                    todayDay === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-8 w-8 mx-auto rounded-lg font-bold flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-xs'
                          : isCurrent
                          ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                          : 'hover:bg-surface-subtle text-content-primary'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions: Clear & This Month / Today */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-content-muted hover:text-danger font-semibold transition-colors px-2 py-1 rounded"
            >
              {isKm ? 'សម្អាត' : 'Clear'}
            </button>

            <button
              type="button"
              onClick={handleCurrent}
              className="text-primary hover:underline font-bold transition-colors px-2 py-1 rounded"
            >
              {mode === 'month'
                ? isKm
                  ? 'ខែនេះ'
                  : 'This month'
                : isKm
                ? 'ថ្ងៃនេះ'
                : 'Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
