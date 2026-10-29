import React from 'react';

export function Skeleton({
  variant = 'rectangular', // 'text', 'circular', 'rectangular'
  width = 'w-full',
  height = 'h-4',
  className = '',
}) {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`animate-pulse bg-surface-hover ${width} ${height} ${
        variantStyles[variant] || variantStyles.rectangular
      } ${className}`}
    />
  );
}
