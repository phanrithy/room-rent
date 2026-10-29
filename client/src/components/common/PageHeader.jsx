import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [], // [{ label, to }]
  backTo = null,
  action = null, // React node (e.g. primary button)
  className = '',
}) {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col gap-2 mb-6 ${className}`}>
      {/* Breadcrumbs or Back Link */}
      {(breadcrumbs.length > 0 || backTo) && (
        <div className="flex items-center gap-2 text-xs text-content-muted">
          {backTo && (
            <button
              type="button"
              onClick={() => (typeof backTo === 'string' ? navigate(backTo) : navigate(-1))}
              className="inline-flex items-center gap-1 hover:text-content-primary font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {backTo && breadcrumbs.length > 0 && <span>•</span>}

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-content-muted/60" />}
              {crumb.to ? (
                <button
                  type="button"
                  onClick={() => navigate(crumb.to)}
                  className="hover:text-content-primary transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-content-primary font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">{title}</h1>
          {subtitle && <p className="text-sm text-content-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
