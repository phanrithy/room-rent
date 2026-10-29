import React, { forwardRef } from 'react';
import { Calendar } from 'lucide-react';

export const DatePicker = forwardRef(function DatePicker(
  {
    label,
    error,
    helperText,
    mode = 'date', // 'date' (YYYY-MM-DD) or 'month' (YYYY-MM)
    fullWidth = true,
    required = false,
    className = '',
    ...props
  },
  ref
) {
  const inputType = mode === 'month' ? 'month' : 'date';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-content-secondary flex items-center gap-1">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-content-muted pointer-events-none">
          <Calendar className="w-5 h-5" />
        </div>
        <input
          ref={ref}
          type={inputType}
          className={`h-11 pl-10 pr-3.5 bg-surface text-content-primary border rounded-md transition-colors text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-surface-subtle disabled:opacity-60 ${
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
});
