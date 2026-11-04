import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  DoorOpen,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Clock,
  Sparkles,
  Gauge,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Users,
  Plus,
  FileSignature,
  FileText,
  Building2,
  Calendar,
  Check,
  ChevronRight,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { OnboardingWizardModal } from '../components/onboarding/OnboardingWizardModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatMonth } from '../utils/format.js';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isTenant } = useAuth();
  const { showError } = useToast();

  useEffect(() => {
    if (isTenant) {
      navigate('/tenant', { replace: true });
    }
  }, [isTenant, navigate]);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [roomFilter, setRoomFilter] = useState('all');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('dashboard');
      setDashboard(data);
    } catch (err) {
      showError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = dashboard?.stats || {};
  const tasks = dashboard?.todayTasks || {};
  const chartData = dashboard?.chartData || [];
  const roomGrid = dashboard?.roomGrid || [];

  const urgentTasksCount =
    (tasks.pendingApplications?.length || 0) +
    (tasks.readingsMissing?.length || 0) +
    (tasks.invoicesToGenerate?.length || 0) +
    (tasks.overdueInvoices?.length || 0) +
    (tasks.expiringContracts?.length || 0) +
    (tasks.openMaintenance?.length || 0);

  const filteredRooms = useMemo(() => {
    if (roomFilter === 'all') return roomGrid;
    return roomGrid.filter((r) => r.status === roomFilter);
  }, [roomGrid, roomFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-12" width="w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Skeleton height="h-32" />
          <Skeleton height="h-32" />
          <Skeleton height="h-32" />
          <Skeleton height="h-32" />
          <Skeleton height="h-32" />
        </div>
        <Skeleton height="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. WELCOME & PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Sunrise Apartments</span>
            <span>•</span>
            <span className="text-content-muted">
              {formatMonth(dashboard?.currentMonth, i18n.language)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-content-primary tracking-tight">
            {t('nav.home')}
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            {t('dashboard.overviewSubtitle', {
              month: formatMonth(dashboard?.currentMonth, i18n.language),
            })}
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            icon={Sparkles}
            onClick={() => setIsOnboardingOpen(true)}
            className="self-start sm:self-auto"
          >
            {t('dashboard.setupWizard')}
          </Button>
        )}
      </div>

      {/* 2. QUICK ACTIONS BAR */}
      <section className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
            {t('dashboard.quickActions')}
          </span>
          <span className="text-[11px] text-content-muted">
            {t('common.actions')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Quick 1: Record Readings */}
          <button
            type="button"
            onClick={() => navigate('/readings')}
            className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-content-primary leading-tight">
                {t('dashboard.recordReadings')}
              </p>
              <p className="text-[10px] text-content-muted">ភ្លើង & ទឹក</p>
            </div>
          </button>

          {/* Quick 2: Invoices */}
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-content-primary leading-tight">
                {t('dashboard.generateInvoices')}
              </p>
              <p className="text-[10px] text-content-muted">Bakong KHQR</p>
            </div>
          </button>

          {/* Quick 3: New Contract */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/contracts?action=new')}
              className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <FileSignature className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-content-primary leading-tight">
                  {t('dashboard.newContract')}
                </p>
                <p className="text-[10px] text-content-muted">អ្នកជួលថ្មី</p>
              </div>
            </button>
          )}

          {/* Quick 4: Add Expense */}
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-content-primary leading-tight">
                {t('dashboard.addExpense')}
              </p>
              <p className="text-[10px] text-content-muted">ចំណាយអគារ</p>
            </div>
          </button>

          {/* Quick 5: Maintenance */}
          <button
            type="button"
            onClick={() => navigate('/maintenance')}
            className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-content-primary leading-tight">
                {t('dashboard.reportIssue')}
              </p>
              <p className="text-[10px] text-content-muted">ជួសជុលបន្ទប់</p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. TODAY'S ACTION ITEMS */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-content-primary">
              {t('dashboard.todaysTasks')}
            </h2>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              urgentTasksCount > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}
          >
            {t('dashboard.tasksToReview', { count: urgentTasksCount })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Pending Tenant Applications */}
          {tasks.pendingApplications?.length > 0 && (
            <div
              onClick={() => navigate('/contracts')}
              className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    {t('dashboard.newApplications')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.pendingCount', {
                      count: tasks.pendingApplications.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {tasks.pendingApplications[0].tenantName} • Room #{tasks.pendingApplications[0].roomNumber}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mt-4 pt-2.5 border-t border-amber-500/20">
                <span>{t('dashboard.reviewContract')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Missing Meter Readings */}
          {tasks.readingsMissing?.length > 0 && (
            <div
              onClick={() => navigate('/readings')}
              className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    {t('dashboard.missingReadings')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.missingReadingsCount', {
                      count: tasks.readingsMissing.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5 truncate max-w-[200px]">
                    {tasks.readingsMissing
                      .slice(0, 3)
                      .map((r) => `#${r.roomNumber}`)
                      .join(', ')}...
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mt-4 pt-2.5 border-t border-blue-500/20">
                <span>{t('dashboard.enterReadingsNow')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Invoices Ready To Generate */}
          {tasks.invoicesToGenerate?.length > 0 && (
            <div
              onClick={() => navigate('/invoices')}
              className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                    {t('dashboard.invoicesReady')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.invoicesReadyCount', {
                      count: tasks.invoicesToGenerate.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {t('dashboard.invoicesReadyHint')}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 mt-4 pt-2.5 border-t border-purple-500/20">
                <span>{t('dashboard.generateInvoicesNow')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Overdue Invoices */}
          {tasks.overdueInvoices?.length > 0 && (
            <div
              onClick={() => navigate('/invoices')}
              className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    {t('dashboard.overdueInvoices')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.overdueCount', {
                      count: tasks.overdueInvoices.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {t('dashboard.overdueHint')}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 mt-4 pt-2.5 border-t border-rose-500/20">
                <span>{t('dashboard.followUpOverdue')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Contracts Ending Soon */}
          {tasks.expiringContracts?.length > 0 && (
            <div
              onClick={() => navigate('/contracts')}
              className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    {t('dashboard.expiringContracts')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.expiringCount', {
                      count: tasks.expiringContracts.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {t('dashboard.expiringHint')}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-4 pt-2.5 border-t border-indigo-500/20">
                <span>{t('dashboard.reviewExpiring')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Open Maintenance */}
          {tasks.openMaintenance?.length > 0 && (
            <div
              onClick={() => navigate('/maintenance')}
              className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/50 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    {t('dashboard.openMaintenance')}
                  </span>
                  <p className="text-lg font-black text-content-primary mt-1">
                    {t('dashboard.openMaintenanceCount', {
                      count: tasks.openMaintenance.length,
                    })}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {t('dashboard.viewMaintenance')}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mt-4 pt-2.5 border-t border-amber-500/20">
                <span>{t('dashboard.viewMaintenance')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {/* Empty State when no urgent tasks */}
          {urgentTasksCount === 0 && (
            <div className="md:col-span-2 lg:col-span-3 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-base text-content-primary">
                  {t('dashboard.allCaughtUp')}
                </p>
                <p className="text-xs text-content-muted mt-0.5">
                  {t('dashboard.allCaughtUpDesc')}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. FINANCIAL HEALTH SUMMARY */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-content-primary">
            {t('dashboard.financialSummary')}
          </h2>
          <span className="text-xs text-content-muted">USD ($) & KHR (៛)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Building Occupancy */}
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted block">
                  {t('dashboard.buildingOccupancy')}
                </span>
                <div className="text-2xl font-black text-content-primary mt-1">
                  {stats.occupancyRate}%
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <DoorOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-content-muted mt-1.5 font-medium">
                {t('dashboard.occupancyDesc', {
                  occupied: stats.occupiedRooms,
                  total: stats.totalRooms,
                })}
              </p>
            </div>
          </div>

          {/* Card 2: Income This Month */}
          <div className="bg-surface border border-emerald-500/20 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  {t('dashboard.incomeThisMonth')}
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatMoney(stats.incomeThisMonth)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-content-muted mt-3 font-medium">
              {t('dashboard.incomeDesc')}
            </p>
          </div>

          {/* Card 3: Unpaid Balance */}
          <div className="bg-surface border border-rose-500/20 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  {t('dashboard.unpaidBalance')}
                </span>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {formatMoney(stats.totalUnpaidBalance)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-content-muted mt-3 font-medium">
              {t('dashboard.unpaidDesc')}
            </p>
          </div>

          {/* Card 4: Expenses This Month */}
          <div className="bg-surface border border-amber-500/20 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  {t('dashboard.expensesThisMonth')}
                </span>
                <div className="text-2xl font-black text-content-primary mt-1 font-mono">
                  {formatMoney(stats.expensesThisMonth)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-content-muted mt-3 font-medium">
              {t('dashboard.expensesDesc')}
            </p>
          </div>

          {/* Card 5: Net Profit */}
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted block">
                  {t('dashboard.netProfit')}
                </span>
                <div
                  className={`text-2xl font-black mt-1 font-mono ${
                    stats.profitThisMonth >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatMoney(stats.profitThisMonth)}
                </div>
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  stats.profitThisMonth >= 0
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-content-muted mt-3 font-medium">
              {t('dashboard.netProfitDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* 5. 12-MONTH FINANCIAL PERFORMANCE CHART */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-content-primary">
            {t('dashboard.financialChart')}
          </h2>
          <span className="text-xs text-content-muted">
            {i18n.language === 'km' ? 'ប្រៀបធៀបប្រចាំខែ' : 'Monthly Trend'}
          </span>
        </div>
        <Card>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name={t('dashboard.income')}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name={t('dashboard.expenses')}
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name={t('dashboard.profit')}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* 6. ROOM STATUS OVERVIEW GRID */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-content-primary">
              {t('dashboard.roomGrid')}
            </h2>
            <p className="text-xs text-content-muted">
              {t('dashboard.roomGridDesc')}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border self-start sm:self-auto overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setRoomFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                roomFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {t('common.all')} ({stats.totalRooms || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter('available')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                roomFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {t('status.available')} ({stats.availableRooms || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter('occupied')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                roomFilter === 'occupied'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {t('status.occupied')} ({stats.occupiedRooms || 0})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter('maintenance')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                roomFilter === 'maintenance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              {t('status.maintenance')} ({stats.maintenanceRooms || 0})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredRooms.map((r) => {
            const isOcc = r.status === 'occupied';
            const isMaint = r.status === 'maintenance';

            return (
              <div
                key={r.id}
                onClick={() => navigate('/rooms')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02] hover:shadow-md select-none group ${
                  isOcc
                    ? 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500'
                    : isMaint
                    ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500'
                    : 'bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                      {t('dashboard.floorN', { floor: r.floor })}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="text-2xl font-black text-content-primary tracking-tight mt-2.5">
                    #{r.roomNumber}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-border/40 space-y-1">
                  <div className="text-xs font-mono font-bold text-content-primary">
                    {formatMoney(r.monthlyRent)} / mo
                  </div>

                  {r.tenantName ? (
                    <div className="flex items-center gap-1.5 text-xs text-content-secondary truncate pt-0.5">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-semibold">{r.tenantName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                      <Plus className="w-3 h-3" />
                      <span>{t('status.available')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={fetchDashboard}
      />
    </div>
  );
}
