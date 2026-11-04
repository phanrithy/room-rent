import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  PieChart,
  Percent,
  CheckCircle2,
  Receipt,
  Zap,
  Droplets,
  Wrench,
  Sparkles,
} from 'lucide-react';
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

import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { DatePicker } from '../components/common/DatePicker.jsx';
import { Card } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { Tabs } from '../components/common/Tabs.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiRequest } from '../utils/api.js';
import { formatMoney, formatMonth } from '../utils/format.js';

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );

  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`reports/monthly?month=${selectedMonth}`);
      setMonthlyData(data);
    } catch (err) {
      showError(err.message || 'Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showError]);

  const fetchYearly = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`reports/yearly?year=${selectedYear}`);
      setYearlyData(data);
    } catch (err) {
      showError(err.message || 'Failed to load yearly report');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showError]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthly();
    } else {
      fetchYearly();
    }
  }, [activeTab, fetchMonthly, fetchYearly]);

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const url =
        activeTab === 'monthly'
          ? `/api/reports/export/monthly?month=${selectedMonth}`
          : `/api/reports/export/yearly?year=${selectedYear}`;
      const filename =
        activeTab === 'monthly'
          ? `financial-report-${selectedMonth}.xlsx`
          : `annual-report-${selectedYear}.xlsx`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
      showSuccess('Financial report exported');
    } catch (err) {
      showError(err.message || 'Failed to export report');
    }
  };

  // Prepare chart data for Annual view
  const annualChartData = yearlyData?.months?.map((m) => {
    const monthNum = m.month.split('-')[1];
    const enMonthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const kmMonthNames = [
      'មករា',
      'កុម្ភៈ',
      'មីនា',
      'មេសា',
      'ឧសភា',
      'មិថុនា',
      'កក្កដា',
      'សីហា',
      'កញ្ញា',
      'តុលា',
      'វិច្ឆិកា',
      'ធ្នូ',
    ];
    const mIdx = parseInt(monthNum, 10) - 1;
    return {
      month: i18n.language === 'km' ? kmMonthNames[mIdx] : enMonthNames[mIdx],
      revenue: Math.round(m.revenue / 100),
      expenses: Math.round(m.expenses / 100),
      profit: Math.round(m.netProfit / 100),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        action={
          <Button variant="secondary" icon={Download} onClick={handleExportExcel}>
            {activeTab === 'monthly'
              ? t('reports.exportMonth')
              : t('reports.exportYear')}
          </Button>
        }
      />

      {/* Navigation Controls: Tabs & Period Selector */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'monthly', label: t('reports.monthlyStatement') },
            { id: 'yearly', label: t('reports.yearlyStatement') },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <div className="flex items-center gap-2">
          {activeTab === 'monthly' ? (
            <div className="w-48">
              <DatePicker
                mode="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-mono bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {i18n.language === 'km' ? `ឆ្នាំ ${y}` : `Year ${y}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton height="h-28" />
            <Skeleton height="h-28" />
            <Skeleton height="h-28" />
            <Skeleton height="h-28" />
          </div>
          <Skeleton height="h-80" />
        </div>
      ) : activeTab === 'monthly' && monthlyData ? (
        /* Monthly Statement View */
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('reports.revenue')}
              value={formatMoney(monthlyData.cashFlow.revenue)}
              subtitle={i18n.language === 'km' ? 'សាច់ប្រាក់ប្រមូលបានក្នុងខែនេះ' : 'Cash collected this month'}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title={t('reports.expenses')}
              value={formatMoney(monthlyData.cashFlow.expenses)}
              subtitle={i18n.language === 'km' ? 'ការចំណាយប្រតិបត្តិការសរុប' : 'Operating costs spent'}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard
              title={t('reports.netProfit')}
              value={formatMoney(monthlyData.cashFlow.netProfit)}
              subtitle={i18n.language === 'km' ? 'ចំណូលដកការចំណាយ' : 'Revenue minus expenses'}
              icon={DollarSign}
              variant={
                monthlyData.cashFlow.netProfit >= 0 ? 'primary' : 'danger'
              }
            />
            <StatCard
              title={t('reports.occupancy')}
              value={`${monthlyData.occupancy.rate}%`}
              subtitle={
                i18n.language === 'km'
                  ? `ជួលបាន ${monthlyData.occupancy.occupiedRooms} / ${monthlyData.occupancy.totalRooms} បន្ទប់`
                  : `${monthlyData.occupancy.occupiedRooms} / ${monthlyData.occupancy.totalRooms} rooms active`
              }
              icon={Building2}
            />
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billed Summary */}
            <Card
              title={t('reports.billedBreakdown')}
              subtitle={
                i18n.language === 'km'
                  ? `វិក្កយបត្រសរុប៖ ${monthlyData.billed.invoiceCount}`
                  : `Total Invoices: ${monthlyData.billed.invoiceCount}`
              }
            >
              <div className="space-y-3 p-2">
                <div className="flex justify-between items-center text-sm py-1 border-b border-border">
                  <span className="text-content-secondary">
                    {i18n.language === 'km' ? 'ថ្លៃឈ្នួលបន្ទប់' : 'Room Rent'}
                  </span>
                  <span className="font-mono font-semibold text-content-primary">
                    {formatMoney(monthlyData.billed.rent)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-border">
                  <span className="text-content-secondary">
                    {i18n.language === 'km' ? 'ថ្លៃភ្លើង' : 'Electricity'}
                  </span>
                  <span className="font-mono font-semibold text-content-primary">
                    {formatMoney(monthlyData.billed.electric)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-border">
                  <span className="text-content-secondary">
                    {i18n.language === 'km' ? 'ថ្លៃទឹក' : 'Water'}
                  </span>
                  <span className="font-mono font-semibold text-content-primary">
                    {formatMoney(monthlyData.billed.water)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-border">
                  <span className="text-content-secondary">
                    {i18n.language === 'km' ? 'សេវាបន្ថែម' : 'Extra Charges'}
                  </span>
                  <span className="font-mono font-semibold text-content-primary">
                    {formatMoney(monthlyData.billed.otherCharges)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-border">
                  <span className="text-content-secondary">
                    {i18n.language === 'km' ? 'ថ្លៃពិន័យយឺតយ៉ាវ' : 'Late Fees'}
                  </span>
                  <span className="font-mono font-semibold text-danger">
                    {formatMoney(monthlyData.billed.lateFee)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-border">
                  <span className="text-content-primary">
                    {t('reports.billedTotal')}
                  </span>
                  <span className="font-mono text-primary text-lg">
                    {formatMoney(monthlyData.billed.total)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-success-bg border border-success-border rounded-lg p-2 text-center">
                    <span className="text-content-muted block">
                      {i18n.language === 'km' ? 'ប្រមូលបាន' : 'Collected'}
                    </span>
                    <span className="font-mono font-bold text-success text-sm">
                      {formatMoney(monthlyData.billed.collected)}
                    </span>
                  </div>
                  <div className="bg-surface-subtle border border-border rounded-lg p-2 text-center">
                    <span className="text-content-muted block">
                      {i18n.language === 'km' ? 'មិនទាន់ប្រមូល' : 'Outstanding'}
                    </span>
                    <span className="font-mono font-bold text-danger text-sm">
                      {formatMoney(monthlyData.billed.outstanding)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Operating Expenses Breakdown */}
            <Card
              title={t('reports.expenseBreakdown')}
              subtitle={
                i18n.language === 'km'
                  ? `ចំណាយសរុប៖ ${formatMoney(monthlyData.cashFlow.expenses)}`
                  : `Total Spent: ${formatMoney(monthlyData.cashFlow.expenses)}`
              }
            >
              <div className="space-y-4 p-2">
                {monthlyData.cashFlow.expenseCategories?.length === 0 ? (
                  <p className="text-sm text-content-muted text-center py-8">
                    {i18n.language === 'km'
                      ? 'មិនមានការចំណាយក្នុងខែនេះទេ'
                      : 'No expenses recorded for this month.'}
                  </p>
                ) : (
                  monthlyData.cashFlow.expenseCategories.map((c) => {
                    const pct =
                      monthlyData.cashFlow.expenses > 0
                        ? Math.round(
                            (c.totalAmount / monthlyData.cashFlow.expenses) * 100
                          )
                        : 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize font-medium text-content-primary">
                            {t(`expenses.categories.${c.category}`, c.category)}
                          </span>
                          <span className="font-mono font-bold text-content-primary">
                            {formatMoney(c.totalAmount)}{' '}
                            <span className="text-content-muted font-normal">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border">
                          <div
                            className="bg-danger h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Payments By Method breakdown */}
                <div className="pt-4 border-t border-border">
                  <span className="text-xs font-bold text-content-primary block mb-2">
                    {i18n.language === 'km'
                      ? 'ការប្រមូលប្រាក់តាមវិធីសាស្រ្ត'
                      : 'Collections By Method'}
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 border border-border rounded-lg text-center">
                      <span className="text-content-muted block">{t('payments.cash')}</span>
                      <span className="font-mono font-semibold text-content-primary">
                        {formatMoney(monthlyData.cashFlow.paymentsByMethod.cash)}
                      </span>
                    </div>
                    <div className="p-2 border border-border rounded-lg text-center">
                      <span className="text-content-muted block">{t('payments.bank')}</span>
                      <span className="font-mono font-semibold text-content-primary">
                        {formatMoney(monthlyData.cashFlow.paymentsByMethod.bank)}
                      </span>
                    </div>
                    <div className="p-2 border border-border rounded-lg text-center">
                      <span className="text-content-muted block">{t('payments.qr')}</span>
                      <span className="font-mono font-semibold text-primary">
                        {formatMoney(monthlyData.cashFlow.paymentsByMethod.qr)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === 'yearly' && yearlyData ? (
        /* Annual Statement View */
        <div className="space-y-6">
          {/* Annual KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title={i18n.language === 'km' ? `ចំណូលប្រចាំឆ្នាំ (${yearlyData.year})` : `Annual Revenue (${yearlyData.year})`}
              value={formatMoney(yearlyData.annualRevenue)}
              subtitle={i18n.language === 'km' ? 'ការទូទាត់ប្រមូលបានសរុប' : 'All collected payments'}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title={i18n.language === 'km' ? `ការចំណាយប្រចាំឆ្នាំ (${yearlyData.year})` : `Annual Expenses (${yearlyData.year})`}
              value={formatMoney(yearlyData.annualExpenses)}
              subtitle={i18n.language === 'km' ? 'ការចំណាយប្រតិបត្តិការសរុប' : 'All operating costs'}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard
              title={i18n.language === 'km' ? `ប្រាក់ចំណេញសុទ្ធប្រចាំឆ្នាំ (${yearlyData.year})` : `Net Annual Profit (${yearlyData.year})`}
              value={formatMoney(yearlyData.annualNetProfit)}
              subtitle={i18n.language === 'km' ? 'ផលចំណេញប្រតិបត្តិការសរុប' : 'Total operating margin'}
              icon={DollarSign}
              variant={yearlyData.annualNetProfit >= 0 ? 'primary' : 'danger'}
            />
          </div>

          {/* 12-Month Performance Chart */}
          <Card
            title={
              i18n.language === 'km'
                ? 'លំហូរសាច់ប្រាក់ & ផលចំណេញរយៈពេល ១២ ខែ ($)'
                : '12-Month Cash Flow & Profit Performance ($)'
            }
            subtitle={
              i18n.language === 'km'
                ? 'ប្រៀបធៀបចំណូលប្រមូលបាន ការចំណាយប្រតិបត្តិការ និងប្រាក់ចំណេញសុទ្ធ'
                : 'Monthly comparison of collections, operating expenses, and net profit'
            }
          >
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`$${val.toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="revenue"
                    name={i18n.language === 'km' ? 'ចំណូល ($)' : 'Revenue ($)'}
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name={i18n.language === 'km' ? 'ចំណាយ ($)' : 'Expenses ($)'}
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name={i18n.language === 'km' ? 'ចំណេញសុទ្ធ ($)' : 'Net Profit ($)'}
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 12-Month Table */}
          <Card
            title={
              i18n.language === 'km'
                ? 'តារាងលម្អិតតាមខែនីមួយៗ'
                : 'Monthly Breakdown Details'
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-content-secondary uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">{t('common.month')}</th>
                    <th className="px-4 py-3">
                      {i18n.language === 'km' ? 'វិក្កយបត្រ ($)' : 'Billed ($)'}
                    </th>
                    <th className="px-4 py-3">
                      {i18n.language === 'km' ? 'ចំណូល ($)' : 'Revenue ($)'}
                    </th>
                    <th className="px-4 py-3">
                      {i18n.language === 'km' ? 'ចំណាយ ($)' : 'Expenses ($)'}
                    </th>
                    <th className="px-4 py-3">
                      {i18n.language === 'km' ? 'ចំណេញសុទ្ធ ($)' : 'Net Profit ($)'}
                    </th>
                    <th className="px-4 py-3">
                      {i18n.language === 'km' ? 'អត្រាជួល' : 'Occupancy'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {yearlyData.months.map((m) => (
                    <tr
                      key={m.month}
                      className="hover:bg-surface-subtle transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-content-primary">
                        {formatMonth(m.month, i18n.language)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatMoney(m.billedTotal)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-success">
                        +{formatMoney(m.revenue)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-danger">
                        -{formatMoney(m.expenses)}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-bold ${
                          m.netProfit >= 0 ? 'text-primary' : 'text-danger'
                        }`}
                      >
                        {formatMoney(m.netProfit)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {m.occupancyRate}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-subtle font-bold border-t-2 border-border">
                    <td className="px-4 py-3">{t('common.total')}</td>
                    <td className="px-4 py-3 font-mono">—</td>
                    <td className="px-4 py-3 font-mono text-success">
                      +{formatMoney(yearlyData.annualRevenue)}
                    </td>
                    <td className="px-4 py-3 font-mono text-danger">
                      -{formatMoney(yearlyData.annualExpenses)}
                    </td>
                    <td className="px-4 py-3 font-mono text-primary text-sm">
                      {formatMoney(yearlyData.annualNetProfit)}
                    </td>
                    <td className="px-4 py-3 font-mono">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
