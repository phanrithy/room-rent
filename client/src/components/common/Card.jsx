import React from 'react';

export function Card({
  title,
  subtitle,
  action = null,
  children,
  footer = null,
  className = '',
  padding = true,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-lg shadow-sm overflow-hidden ${
        onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            {title && <h3 className="text-base font-semibold text-content-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer && (
        <div className="px-5 py-3.5 bg-surface-subtle border-t border-border">{footer}</div>
      )}
    </div>
  );
}
