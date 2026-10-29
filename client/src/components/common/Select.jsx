import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    fullWidth = true,
    required = false,
    className = '',
    placeholder,
    ...props
  },
  ref
) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-content-secondary flex items-center gap-1">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          className={`h-11 px-3.5 pr-10 bg-surface text-content-primary border rounded-md transition-colors text-sm w-full appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-surface-subtle disabled:opacity-60 ${
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 text-content-muted pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="text-xs text-danger font-medium mt-0.5">{error}</p>}
      {!error && helperText && (
        <p className="text-xs text-content-muted mt-0.5">{helperText}</p>
      )}
    </div>
  );
});
