import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-content-muted mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-content-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-content-muted max-w-sm mb-5">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
