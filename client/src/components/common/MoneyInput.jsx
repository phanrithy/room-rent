import React, { useState, useEffect } from 'react';
import { dollarsToCents, centsToDollars } from '../../utils/format.js';

export function MoneyInput({
  label,
  value = 0, // cents
  onChange, // receives cents
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  placeholder = '0.00',
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(() => (value ? centsToDollars(value) : ''));

  useEffect(() => {
    // Sync external changes when not focused/typing
    if (value !== undefined) {
      const formatted = value === 0 ? '' : centsToDollars(value);
      if (dollarsToCents(displayValue) !== value) {
        setDisplayValue(formatted);
      }
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // Allow numbers and at most one decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(raw) || raw === '') {
      setDisplayValue(raw);
      if (onChange) {
        onChange(dollarsToCents(raw));
      }
    }
  };

  const handleBlur = () => {
    if (displayValue) {
      const cents = dollarsToCents(displayValue);
      setDisplayValue(centsToDollars(cents));
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-content-secondary flex items-center gap-1">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-content-muted font-semibold text-sm select-none pointer-events-none">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-11 pl-8 pr-3.5 bg-surface text-content-primary border rounded-md transition-colors text-sm w-full font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-surface-subtle disabled:opacity-60 ${
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger font-medium mt-0.5">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-content-muted mt-0.5">{helperText}</p>
      )}
    </div>
  );
}
