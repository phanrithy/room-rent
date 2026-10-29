import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
} from 'lucide-react';

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="h-10" width="w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Skeleton height="h-28" />
          <Skeleton height="h-28" />
          <Skeleton height="h-28" />
          <Skeleton height="h-28" />
          <Skeleton height="h-28" />
        </div>
        <Skeleton height="h-64" />
      </div>
    );
  }

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

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('nav.home')}
        subtitle={`Building Overview & Today's Actions for ${formatMonth(dashboard?.currentMonth, i18n.language)}`}
        action={
          isAdmin && (
            <Button
              variant="outline"
              icon={Sparkles}
              onClick={() => setIsOnboardingOpen(true)}
            >
              Setup Wizard
            </Button>
          )
        }
      />

      {/* 1. TODAY'S TASKS LIST */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-content-primary">
              Today's Action Items
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary/20">
            {urgentTasksCount} tasks to review
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Pending Tenant Applications */}
          {tasks.pendingApplications?.length > 0 && (
            <div
              onClick={() => navigate('/contracts')}
              className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 cursor-pointer hover:bg-amber-500/20 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    {i18n.language === 'km' ? 'ពាក្យស្នើសុំជួលបន្ទប់ថ្មី' : 'New Room Applications'}
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.pendingApplications.length} {i18n.language === 'km' ? 'រង់ចាំការយល់ព្រម' : 'pending applications'}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {tasks.pendingApplications[0].tenantName} applied for Room #{tasks.pendingApplications[0].roomNumber}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500 text-white">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-3 pt-2 border-t border-amber-500/20">
                <span>{i18n.language === 'km' ? 'ពិនិត្យ & បង្កើតកិច្ចសន្យា' : 'Review & Agree to Contract'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Missing Readings */}
          {tasks.readingsMissing?.length > 0 && (
            <div
              onClick={() => navigate('/readings')}
              className="p-4 rounded-xl border border-warning-border bg-warning-bg/40 cursor-pointer hover:bg-warning-bg/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-warning-text block">
                    Meter Readings Missing
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.readingsMissing.length} rooms need current readings
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    Rooms: {tasks.readingsMissing.slice(0, 3).map((r) => `#${r.roomNumber}`).join(', ')}...
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-warning-bg text-warning">
                  <Gauge className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-warning-text mt-3 pt-2 border-t border-warning-border/50">
                <span>Enter readings now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Invoices to Generate */}
          {tasks.invoicesToGenerate?.length > 0 && (
            <div
              onClick={() => navigate('/invoices')}
              className="p-4 rounded-xl border border-primary/30 bg-primary-light/40 cursor-pointer hover:bg-primary-light/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                    Invoices Ready To Generate
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.invoicesToGenerate.length} contracts ready for billing
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    Readings recorded. Click to generate invoices.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary-light text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-3 pt-2 border-t border-primary/20">
                <span>Generate invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Overdue Invoices */}
          {tasks.overdueInvoices?.length > 0 && (
            <div
              onClick={() => navigate('/invoices')}
              className="p-4 rounded-xl border border-danger-border bg-danger-bg/40 cursor-pointer hover:bg-danger-bg/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-danger-text block">
                    Overdue Invoices
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.overdueInvoices.length} overdue payments
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    Past due date. Send reminders or collect payments.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-danger-bg text-danger">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-danger-text mt-3 pt-2 border-t border-danger-border/50">
                <span>Follow up on overdue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Contracts Ending Soon */}
          {tasks.expiringContracts?.length > 0 && (
            <div
              onClick={() => navigate('/contracts')}
              className="p-4 rounded-xl border border-info-border bg-info-bg/40 cursor-pointer hover:bg-info-bg/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-info-text block">
                    Contracts Ending In 30 Days
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.expiringContracts.length} leases expiring soon
                  </p>
                  <p className="text-xs text-content-muted mt-0.5">
                    Discuss renewal or plan move-out inspection.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-info-bg text-info">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-info-text mt-3 pt-2 border-t border-info-border/50">
                <span>Review expiring leases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Open Maintenance */}
          {tasks.openMaintenance?.length > 0 && (
            <div
              onClick={() => navigate('/maintenance')}
              className="p-4 rounded-xl border border-border bg-surface cursor-pointer hover:bg-surface-hover transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-content-muted block">
                    Maintenance Requests
                  </span>
                  <p className="text-base font-bold text-content-primary mt-1">
                    {tasks.openMaintenance.length} open maintenance requests
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-surface-subtle text-content-secondary">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {urgentTasksCount === 0 && (
            <div className="md:col-span-2 lg:col-span-3 p-6 rounded-xl border border-success-border bg-success-bg/30 text-success-text flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold text-sm">All caught up for today!</p>
                <p className="text-xs text-content-muted">
                  No missing meter readings, invoices to generate, or overdue invoices.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. STAT CARDS */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-content-primary">
          Monthly Financial Summary
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <StatCard
            title="Building Occupancy"
            value={`${stats.occupancyRate}%`}
            subtitle={`${stats.occupiedRooms} of ${stats.totalRooms} rooms occupied`}
            icon={DoorOpen}
            color="primary"
          />
          <StatCard
            title="Income This Month"
            value={formatMoney(stats.incomeThisMonth)}
            subtitle="Payments received"
            icon={DollarSign}
            color="success"
          />
          <StatCard
            title="Unpaid Balance"
            value={formatMoney(stats.totalUnpaidBalance)}
            subtitle="Outstanding invoices"
            icon={TrendingUp}
            color="danger"
          />
          <StatCard
            title="Expenses This Month"
            value={formatMoney(stats.expensesThisMonth)}
            subtitle="Building operating costs"
            icon={Receipt}
            color="warning"
          />
          <StatCard
            title="Net Profit"
            value={formatMoney(stats.profitThisMonth)}
            subtitle="Income minus expenses"
            icon={DollarSign}
            color={stats.profitThisMonth >= 0 ? 'success' : 'danger'}
          />
        </div>
      </section>

      {/* 3. 12-MONTH INCOME & EXPENSES & PROFIT CHART */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-content-primary">
            12-Month Financial Performance ($)
          </h2>
        </div>
        <Card>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
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
                <Bar dataKey="income" name="Income ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses ($)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* 4. ROOM STATUS GRID */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-content-primary">
              Room Status Grid
            </h2>
            <p className="text-xs text-content-muted">
              Click any room tile to view details or manage lease
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              {t('status.available')} ({stats.availableRooms})
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              {t('status.occupied')} ({stats.occupiedRooms})
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-warning"></span>
              {t('status.maintenance')} ({stats.maintenanceRooms})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {roomGrid.map((r) => {
            const isOcc = r.status === 'occupied';
            const isMaint = r.status === 'maintenance';

            return (
              <div
                key={r.id}
                onClick={() => navigate('/rooms')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:scale-102 hover:shadow-md select-none ${
                  isOcc
                    ? 'bg-primary-light/60 border-primary/30 text-primary'
                    : isMaint
                    ? 'bg-warning-bg border-warning-border text-warning-text'
                    : 'bg-surface border-success-border/60 hover:border-success text-content-primary'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                    Floor {r.floor}
                  </span>
                  <div className="text-xl font-black text-content-primary tracking-tight">
                    #{r.roomNumber}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 space-y-0.5">
                  <div className="text-xs font-mono font-bold text-content-primary">
                    {formatMoney(r.monthlyRent)}
                  </div>
                  {r.tenantName ? (
                    <p className="text-[11px] truncate font-medium text-content-secondary">
                      {r.tenantName}
                    </p>
                  ) : (
                    <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
                      {r.status}
                    </p>
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
