import { getDb } from '../db/connection.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { roomRepository } from '../repositories/room.repository.js';

export class ReportService {
  /**
   * Get detailed monthly financial statement
   * @param {string} month 'YYYY-MM'
   */
  getMonthlyReport(month) {
    const db = getDb();

    // 1. Invoices Billed in this month
    const invRow = db
      .prepare(`
        SELECT 
          COUNT(*) as invoice_count,
          COALESCE(SUM(rent), 0) as total_rent,
          COALESCE(SUM(electric_cost), 0) as total_electric,
          COALESCE(SUM(water_cost), 0) as total_water,
          COALESCE(SUM(other_charges), 0) as total_other_charges,
          COALESCE(SUM(late_fee), 0) as total_late_fee,
          COALESCE(SUM(total), 0) as total_billed,
          COALESCE(SUM(paid_amount), 0) as total_collected_for_month,
          COALESCE(SUM(total - paid_amount), 0) as outstanding_balance
        FROM invoices
        WHERE month = ?
      `)
      .get(month);

    // 2. Payments actually received in this calendar month
    const payRows = db
      .prepare(`
        SELECT method, COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE substr(paid_at, 1, 7) = ?
        GROUP BY method
      `)
      .all(month);

    const paymentsByMethod = { cash: 0, bank: 0, qr: 0 };
    let actualRevenueReceived = 0;
    for (const r of payRows) {
      paymentsByMethod[r.method] = r.total;
      actualRevenueReceived += r.total;
    }

    // 3. Expenses spent in this calendar month
    const expenseCategories = expenseRepository.getCategorySummary({ month });
    const totalExpenses = expenseRepository.getTotalSpent({ month });

    // 4. Net Profit = Actual Revenue Received - Total Expenses
    const netProfit = actualRevenueReceived - totalExpenses;

    // 5. Total Rooms and Occupancy Rate for the month
    const allRooms = roomRepository.findAll();
    const activeInvoicesCount = invRow.invoice_count;
    const occupancyRate = allRooms.length > 0
      ? Math.round((activeInvoicesCount / allRooms.length) * 100)
      : 0;

    return {
      month,
      billed: {
        invoiceCount: invRow.invoice_count,
        rent: invRow.total_rent,
        electric: invRow.total_electric,
        water: invRow.total_water,
        otherCharges: invRow.total_other_charges,
        lateFee: invRow.total_late_fee,
        total: invRow.total_billed,
        collected: invRow.total_collected_for_month,
        outstanding: invRow.outstanding_balance,
      },
      cashFlow: {
        revenue: actualRevenueReceived,
        expenses: totalExpenses,
        netProfit,
        paymentsByMethod,
        expenseCategories,
      },
      occupancy: {
        totalRooms: allRooms.length,
        occupiedRooms: activeInvoicesCount,
        rate: occupancyRate,
      },
    };
  }

  /**
   * Get 12-month financial overview for a given year
   * @param {number|string} year 'YYYY'
   */
  getYearlyReport(year) {
    const yStr = String(year);
    const months = [];
    let annualRevenue = 0;
    let annualExpenses = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${yStr}-${String(m).padStart(2, '0')}`;
      const report = this.getMonthlyReport(monthStr);

      months.push({
        month: monthStr,
        billedTotal: report.billed.total,
        revenue: report.cashFlow.revenue,
        expenses: report.cashFlow.expenses,
        netProfit: report.cashFlow.netProfit,
        occupancyRate: report.occupancy.rate,
      });

      annualRevenue += report.cashFlow.revenue;
      annualExpenses += report.cashFlow.expenses;
    }

    const annualNetProfit = annualRevenue - annualExpenses;

    return {
      year: parseInt(yStr, 10),
      annualRevenue,
      annualExpenses,
      annualNetProfit,
      months,
    };
  }
}

export const reportService = new ReportService();
