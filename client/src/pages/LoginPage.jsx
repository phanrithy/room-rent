import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Languages, Sun, Moon, Laptop, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { setAppLanguage } from '../i18n/index.js';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'Admin#2026!',
    },
  });

  const handleFillDemo = (username, password) => {
    setValue('username', username, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError(null);
    try {
      await login(data.username, data.password);
      showSuccess(`Welcome back!`);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.status === 429) {
        setLoginError(err.message || 'Too many attempts. Please try again shortly.');
      } else {
        const translatedMsg = t(`errors.${err.code}`, err.message || t('errors.INVALID_CREDENTIALS'));
        setLoginError(translatedMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'km' : 'en';
    setAppLanguage(nextLang);
  };

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    setTheme(order[nextIdx]);
  };

  return (
    <div className="min-h-screen bg-app flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Controls */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
            SR
          </div>
          <span className="font-bold text-content-primary">Sunrise Rent</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-content-primary transition-colors min-h-[36px]"
          >
            <Languages className="w-4 h-4 text-primary" />
            <span>{i18n.language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
          </button>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={cycleTheme}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-content-secondary hover:text-content-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
            {theme === 'system' && <Laptop className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-content-muted mt-1.5">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger-text text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t('auth.username')}
              icon={User}
              placeholder="admin"
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              type="password"
              label={t('auth.password')}
              icon={Lock}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          {/* Quick 1-Click Demo Login Selector */}
          <div className="mt-6 p-3.5 rounded-xl bg-surface-subtle border border-border text-xs text-content-muted text-center space-y-2">
            <p className="font-semibold text-content-secondary">1-Click Demo Account Autofill:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin', 'Admin#2026!')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary hover:text-primary transition-colors font-semibold text-content-primary"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('staff', 'Staff#2026!')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary hover:text-primary transition-colors font-semibold text-content-primary"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('sokha', 'Tenant#2026!')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary hover:text-primary transition-colors font-semibold text-content-primary"
              >
                Tenant
              </button>
            </div>
            <p className="text-[11px] text-content-muted">
              Click any role above to fill credentials, then press <b>Sign In</b>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-content-muted py-4">
        © 2026 Sunrise Rent Management. Designed for landlords in Cambodia.
      </footer>
    </div>
  );
}
