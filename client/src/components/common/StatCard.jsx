import React from 'react';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon = null,
  color = 'primary', // 'primary', 'success', 'warning', 'danger', 'info'
  trend = null, // e.g. "+5% from last month"
  className = '',
  onClick,
}) {
  const iconColorStyles = {
    primary: 'bg-primary-light text-primary',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-info-bg text-info',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-lg p-5 shadow-sm flex items-start justify-between ${
        onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
      } ${className}`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-content-secondary uppercase tracking-wider">
          {title}
        </span>
        <div className="text-2xl font-bold text-content-primary tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 text-xs text-content-muted mt-0.5">
            {trend && <span className="font-medium text-success">{trend}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>

      {Icon && (
        <div className={`p-3 rounded-lg ${iconColorStyles[color] || iconColorStyles.primary}`}>
          <Icon className="w-6 h-6 shrink-0" />
        </div>
      )}
    </div>
  );
}
