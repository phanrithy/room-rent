import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  Moon,
  Laptop,
  Languages,
  Bell,
  Search,
  Building2,
  LogOut,
  KeyRound,
  User,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { setAppLanguage } from '../../i18n/index.js';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export function TopBar({ onOpenMobileDrawer }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, logout, changePassword } = useAuth();
  const { showSuccess, showError } = useToast();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'km' : 'en';
    setAppLanguage(nextLang);
  };

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    setTheme(order[nextIdx]);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError(t('auth.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showSuccess(t('auth.passwordChanged'));
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between z-10">
      {/* Left side: Property Selector & Mobile Menu trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="md:hidden p-2 rounded-lg text-content-secondary hover:bg-surface-hover"
        >
          <Building2 className="w-5 h-5 text-primary" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-content-primary">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="hidden sm:inline">Sunrise Apartments</span>
        </div>
      </div>

      {/* Right side: Global controls (Search, Language, Theme, User) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Switch */}
        <button
          type="button"
          onClick={toggleLanguage}
          title={i18n.language === 'en' ? 'Switch to Khmer' : 'Switch to English'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-content-primary transition-colors min-h-[36px]"
        >
          <Languages className="w-4 h-4 text-primary" />
          <span>{i18n.language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
        </button>

        {/* Theme Switch */}
        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-content-secondary hover:text-content-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
          {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
          {theme === 'system' && <Laptop className="w-4 h-4" />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg hover:bg-surface-hover transition-colors min-h-[36px]"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-content-primary leading-tight">
                {user?.username || 'Admin'}
              </span>
              <span className="text-[10px] text-content-muted uppercase tracking-wider">
                {user?.role || 'admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-content-muted" />
          </button>

          {/* User dropdown popup */}
          {userMenuOpen && (
            <div
              className="absolute right-0 mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-30"
              onClick={() => setUserMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-medium text-content-muted">Signed in as</p>
                <p className="text-sm font-semibold text-content-primary truncate">{user?.username}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-content-secondary hover:bg-surface-hover hover:text-content-primary"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t('auth.changePassword')}</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-danger hover:bg-danger-bg hover:text-danger-text"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('auth.changePassword')}
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            type="password"
            label={t('auth.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            label={t('auth.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="At least 6 characters"
          />
          <Input
            type="password"
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowPasswordModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" loading={passwordLoading}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
