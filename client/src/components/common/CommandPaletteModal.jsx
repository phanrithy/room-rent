import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Home,
  DoorClosed,
  Users,
  FileSignature,
  Gauge,
  FileText,
  CreditCard,
  TrendingDown,
  BarChart3,
  Wrench,
  Settings,
  History,
  Plus,
  Sun,
  Moon,
  Languages,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { setAppLanguage } from '../../i18n/index.js';
import { apiRequest } from '../../utils/api.js';

export function CommandPaletteModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, isTenant } = useAuth();
  const { theme, setTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entityResults, setEntityResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  // Base navigation pages
  const basePages = [
    { id: 'nav-home', title: t('nav.home'), path: '/', icon: Home, group: 'Pages' },
    ...(!isTenant
      ? [
          { id: 'nav-rooms', title: t('nav.rooms'), path: '/rooms', icon: DoorClosed, group: 'Pages' },
          { id: 'nav-tenants', title: t('nav.tenants'), path: '/tenants', icon: Users, group: 'Pages' },
          { id: 'nav-contracts', title: t('nav.contracts'), path: '/contracts', icon: FileSignature, group: 'Pages' },
          { id: 'nav-readings', title: t('nav.readings'), path: '/readings', icon: Gauge, group: 'Pages' },
          { id: 'nav-invoices', title: t('nav.invoices'), path: '/invoices', icon: FileText, group: 'Pages' },
          { id: 'nav-payments', title: t('nav.payments'), path: '/payments', icon: CreditCard, group: 'Pages' },
          { id: 'nav-expenses', title: t('nav.expenses'), path: '/expenses', icon: TrendingDown, group: 'Pages' },
          { id: 'nav-reports', title: t('nav.reports'), path: '/reports', icon: BarChart3, group: 'Pages' },
        ]
      : []),
    { id: 'nav-maintenance', title: t('nav.maintenance'), path: isTenant ? '/tenant' : '/maintenance', icon: Wrench, group: 'Pages' },
    ...(isAdmin
      ? [
          { id: 'nav-settings', title: t('nav.settings'), path: '/settings', icon: Settings, group: 'Pages' },
          { id: 'nav-audit', title: t('nav.auditLogs'), path: '/audit-logs', icon: History, group: 'Pages' },
        ]
      : []),
  ];

  // Quick Action items
  const quickActions = [
    ...(!isTenant
      ? [
          {
            id: 'act-new-contract',
            title: t('contracts.newContract'),
            action: () => navigate('/contracts'),
            icon: Plus,
            group: 'Actions',
          },
          {
            id: 'act-record-reading',
            title: t('readings.title'),
            action: () => navigate('/readings'),
            icon: Gauge,
            group: 'Actions',
          },
          {
            id: 'act-gen-invoices',
            title: t('invoices.generate'),
            action: () => navigate('/invoices'),
            icon: FileText,
            group: 'Actions',
          },
          {
            id: 'act-record-expense',
            title: t('expenses.recordExpense'),
            action: () => navigate('/expenses'),
            icon: TrendingDown,
            group: 'Actions',
          },
        ]
      : []),
    {
      id: 'act-toggle-theme',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      icon: theme === 'dark' ? Sun : Moon,
      group: 'Actions',
    },
    {
      id: 'act-switch-lang',
      title: i18n.language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ (Khmer)' : 'Switch to English',
      action: () => setAppLanguage(i18n.language === 'en' ? 'km' : 'en'),
      icon: Languages,
      group: 'Actions',
    },
  ];

  // Search entities dynamically when query >= 2 chars
  useEffect(() => {
    if (!query.trim() || query.length < 2 || isTenant) {
      setEntityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = encodeURIComponent(query.trim());
        const [roomsRes, tenantsRes] = await Promise.allSettled([
          apiRequest(`rooms?q=${q}&pageSize=5`),
          apiRequest(`tenants?q=${q}&pageSize=5`),
        ]);

        const results = [];
        if (roomsRes.status === 'fulfilled' && roomsRes.value?.items) {
          roomsRes.value.items.forEach((r) => {
            results.push({
              id: `room-${r.id}`,
              title: `${t('readings.room')} ${r.roomNumber} (Floor ${r.floor})`,
              subtitle: `${r.status} • $${(r.monthlyRent / 100).toFixed(2)}/mo`,
              path: '/rooms',
              icon: DoorClosed,
              group: 'Rooms',
            });
          });
        }
        if (tenantsRes.status === 'fulfilled' && tenantsRes.value?.items) {
          tenantsRes.value.items.forEach((ten) => {
            results.push({
              id: `tenant-${ten.id}`,
              title: ten.name,
              subtitle: `${ten.phone || 'No phone'} • ${ten.email || ''}`,
              path: '/tenants',
              icon: Users,
              group: 'Tenants',
            });
          });
        }
        setEntityResults(results);
      } catch (err) {
        // quiet fallback
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isTenant, t]);

  // Combine and filter items
  const filteredPages = basePages.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );
  const filteredActions = quickActions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  const combinedItems = [
    ...entityResults,
    ...filteredPages,
    ...filteredActions,
  ];

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setEntityResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Adjust selected index boundary
  useEffect(() => {
    if (selectedIndex >= combinedItems.length) {
      setSelectedIndex(0);
    }
  }, [combinedItems.length, selectedIndex]);

  const handleSelect = (item) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (combinedItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? (combinedItems.length ? combinedItems.length - 1 : 0) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        handleSelect(combinedItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface-subtle">
          <Search className="w-5 h-5 text-content-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('palette.placeholder', 'Type a command or search (rooms, tenants, actions)...')}
            className="flex-1 bg-transparent text-content-primary placeholder-content-muted text-sm sm:text-base outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs bg-surface border border-border rounded font-mono text-content-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/40 space-y-1">
          {combinedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-content-muted">
              {searching ? t('common.loading') : t('palette.noResults', 'No matching commands or records found.')}
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const Icon = item.icon || ArrowRight;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-text'
                      : 'text-content-primary hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-subtle border border-border text-content-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate leading-tight">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className={`text-xs truncate ${
                            isSelected ? 'text-white/80' : 'text-content-muted'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-subtle text-content-muted border border-border'
                      }`}
                    >
                      {item.group}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-surface-subtle border-t border-border flex items-center justify-between text-[11px] text-content-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-content-primary mr-1">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-content-primary mr-1">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span>
            Press{' '}
            <kbd className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-content-primary">
              ?
            </kbd>{' '}
            for full shortcuts
          </span>
        </div>
      </div>
    </div>
  );
}
export default CommandPaletteModal;