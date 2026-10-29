import React from 'react';

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const sizeStyles = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2 min-h-[44px] min-w-[44px]',
    lg: 'w-12 h-12 p-3 min-h-[48px] min-w-[48px]',
  };

  const variantStyles = {
    primary: 'bg-primary text-primary-text hover:bg-primary-hover shadow-sm',
    secondary: 'bg-surface hover:bg-surface-hover text-content-primary border border-border shadow-sm',
    ghost: 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
    danger: 'text-danger hover:bg-danger-bg hover:text-danger-text',
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <Icon className="w-5 h-5 shrink-0" />
    </button>
  );
}
