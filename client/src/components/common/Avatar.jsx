import React from 'react';

export function Avatar({
  name = 'User',
  src = null,
  size = 'md',
  status = null, // 'online', 'offline'
  className = '',
}) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative inline-block select-none">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`rounded-full object-cover border border-border ${sizeStyles[size]} ${className}`}
        />
      ) : (
        <div
          className={`rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center justify-center ${sizeStyles[size]} ${className}`}
        >
          {initials || 'U'}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-surface ${
            status === 'online' ? 'bg-success' : 'bg-content-muted'
          }`}
        />
      )}
    </div>
  );
}
