import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  FileSignature,
  CreditCard,
  TrendingDown,
  BarChart3,
  Wrench,
  Settings,
  History,
  LayoutGrid,
} from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { MobileTabBar } from './MobileTabBar.jsx';
import { Drawer } from '../common/Drawer.jsx';
import { CommandPaletteModal } from '../common/CommandPaletteModal.jsx';
import { ShortcutsHelpModal } from '../common/ShortcutsHelpModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { setAppLanguage } from '../../i18n/index.js';

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;

      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // / to open Command Palette when not in input
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ? to show Shortcuts when not in input
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Ctrl+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !isInput) {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+D: Toggle Theme
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !isInput) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Ctrl+L: Toggle Language
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !isInput) {
        e.preventDefault();
        setAppLanguage(i18n.language === 'en' ? 'km' : 'en');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme, i18n.language]);

  const moreNavItems = [
    { to: '/tenants', label: t('nav.tenants'), icon: Users },
    { to: '/contracts', label: t('nav.contracts'), icon: FileSignature },
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
    <div className="flex h-screen bg-app overflow-hidden">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main App Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <MobileTabBar onOpenMore={() => setMobileDrawerOpen(true)} />
      </div>

      {/* Command Palette Modal */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Mobile Drawer for Extra Navigation */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title={t('nav.more')}
        position="right"
      >
        <div className="flex flex-col gap-1.5 py-2">
          {moreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-text font-semibold'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </Drawer>
    </div>
  );
}
