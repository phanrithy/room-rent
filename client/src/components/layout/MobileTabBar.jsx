import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, DoorOpen, Gauge, Receipt, Menu, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function MobileTabBar({ onOpenMore }) {
  const { t } = useTranslation();
  const { isTenant } = useAuth();
  const location = useLocation();

  const tabs = isTenant
    ? [
        { to: '/tenant', label: 'My Room', icon: Home, exact: true },
        { to: '/maintenance', label: t('nav.maintenance'), icon: Wrench },
      ]
    : [
        { to: '/', label: t('nav.home'), icon: Home, exact: true },
        { to: '/rooms', label: t('nav.rooms'), icon: DoorOpen },
        { to: '/readings', label: t('nav.readings'), icon: Gauge },
        { to: '/invoices', label: t('nav.invoices'), icon: Receipt },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-40 select-none shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? location.pathname === tab.to
          : location.pathname.startsWith(tab.to);

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-primary font-bold' : 'text-content-muted hover:text-content-primary'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{tab.label}</span>
          </NavLink>
        );
      })}

      {/* More Button to trigger drawer */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-content-muted hover:text-content-primary transition-colors"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  );
}
