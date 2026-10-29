import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Lock,
  Unlock,
  Wrench,
  AlertCircle,
  Clock,
  AlertOctagon,
  Check,
  Archive,
  RefreshCw,
} from 'lucide-react';

const statusConfig = {
  available: {
    icon: Unlock,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    text: 'text-success-text',
    translationKey: 'status.available',
  },
  occupied: {
    icon: Lock,
    bg: 'bg-primary-light',
    border: 'border-primary/20',
    text: 'text-primary',
    translationKey: 'status.occupied',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    text: 'text-warning-text',
    translationKey: 'status.maintenance',
  },
  unpaid: {
    icon: AlertCircle,
    bg: 'bg-danger-bg',
    border: 'border-danger-border',
    text: 'text-danger-text',
    translationKey: 'status.unpaid',
  },
  partial: {
    icon: Clock,
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    text: 'text-warning-text',
    translationKey: 'status.partial',
  },
  paid: {
    icon: CheckCircle2,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    text: 'text-success-text',
    translationKey: 'status.paid',
  },
  overdue: {
    icon: AlertOctagon,
    bg: 'bg-danger-bg',
    border: 'border-danger-border',
    text: 'text-danger-text',
    translationKey: 'status.overdue',
  },
  active: {
    icon: Check,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    text: 'text-success-text',
    translationKey: 'status.active',
  },
  ended: {
    icon: Archive,
    bg: 'bg-surface-subtle',
    border: 'border-border',
    text: 'text-content-muted',
    translationKey: 'status.ended',
  },
  open: {
    icon: Clock,
    bg: 'bg-info-bg',
    border: 'border-info-border',
    text: 'text-info-text',
    translationKey: 'status.open',
  },
  in_progress: {
    icon: RefreshCw,
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    text: 'text-warning-text',
    translationKey: 'status.in_progress',
  },
  done: {
    icon: CheckCircle2,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    text: 'text-success-text',
    translationKey: 'status.done',
  },
};

export function StatusBadge({ status, customLabel = null, size = 'md' }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || {
    icon: AlertCircle,
    bg: 'bg-surface-subtle',
    border: 'border-border',
    text: 'text-content-secondary',
    translationKey: status,
  };

  const Icon = config.icon;
  const label = customLabel || t(config.translationKey, status);

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs select-none ${config.bg} ${config.border} ${config.text} ${
        sizeStyles[size] || sizeStyles.md
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span className="capitalize">{label}</span>
    </span>
  );
}
