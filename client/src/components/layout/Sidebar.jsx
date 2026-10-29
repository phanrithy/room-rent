import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  DoorOpen,
  Users,
  FileSignature,
  Gauge,
  Receipt,
  CreditCard,
  TrendingDown,
  BarChart3,
  Wrench,
  Settings,
  History,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Sidebar({ collapsed, onToggle }) {
  const { t } = useTranslation();
  const { isAdmin, isStaff, isTenant } = useAuth();
  const location = useLocation();

  const navItems = isTenant
    ? [
        { to: '/tenant', label: t('nav.home'), icon: Home, exact: true },
        { to: '/maintenance', label: t('nav.maintenance'), icon: Wrench },
      ]
    : [
        { to: '/', label: t('nav.home'), icon: Home, exact: true },
        { to: '/rooms', label: t('nav.rooms'), icon: DoorOpen },
        { to: '/tenants', label: t('nav.tenants'), icon: Users },
        { to: '/contracts', label: t('nav.contracts'), icon: FileSignature },
        { to: '/readings', label: t('nav.readings'), icon: Gauge },
        { to: '/invoices', label: t('nav.invoices'), icon: Receipt },
        { to: '/payments', label: t('nav.payments'), icon: CreditCard },
        { to: '/expenses', label: t('nav.expenses'), icon: TrendingDown },
        { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
        { to: '/maintenance', label: t('nav.maintenance'), icon: Wrench },
        ...(isAdmin
          ? [
              { to: '/settings', label: t('nav.settings'), icon: Settings },
              { to: '/audit-logs', label: t('nav.auditLogs'), icon: History },
            ]
          : []),
        { to: '/dev/components', label: t('nav.devGallery'), icon: LayoutGrid },
      ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-surface border-r border-border transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              SR
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-content-primary block truncate">
                Sunrise Rent
              </span>
              <span className="text-xs text-content-muted block truncate">
                Phnom Penh
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
              SR
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-hover ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-text font-semibold shadow-xs'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
