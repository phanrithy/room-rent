import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class DashboardService {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Gather complete landlord dashboard metrics
   */
  getDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // 1. Rooms & Occupancy
    const totalRoomsRow = this.db.prepare('SELECT COUNT(*) as count FROM rooms').get();
    const occupiedRoomsRow = this.db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get();
    const availableRoomsRow = this.db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get();
    const maintenanceRoomsRow = this.db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'").get();

    const totalRooms = totalRoomsRow ? totalRoomsRow.count : 0;
    const occupiedRooms = occupiedRoomsRow ? occupiedRoomsRow.count : 0;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // 2. Financials for current month
    // Income: Sum of payments made in current month
    const incomeRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE paid_at LIKE ?
    `).get(`${currentMonth}%`);
    const incomeThisMonth = incomeRow ? incomeRow.total : 0;

    // Expenses for current month
    const expenseRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE spent_at LIKE ?
    `).get(`${currentMonth}%`);
    const expensesThisMonth = expenseRow ? expenseRow.total : 0;

    // Net Profit
    const profitThisMonth = incomeThisMonth - expensesThisMonth;

    // Unpaid Balance across all invoices
    const unpaidRow = this.db.prepare(`
      SELECT COALESCE(SUM(total - paid_amount), 0) as total
      FROM invoices
      WHERE status IN ('unpaid', 'partial', 'overdue')
    `).get();
    const totalUnpaidBalance = unpaidRow ? unpaidRow.total : 0;

    // Pending Room Applications
    const pendingAppsRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM room_applications WHERE status = 'pending'
    `).get();
    const pendingApplicationsCount = pendingAppsRow ? pendingAppsRow.count : 0;

    // 3. Today Tasks (Urgent landlord action items)
    // A. Active contracts missing meter readings this month
    const readingsMissing = this.db.prepare(`
      SELECT c.id as contract_id, c.room_id, r.room_number, t.name as tenant_name
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM meter_readings mr
          WHERE mr.room_id = c.room_id AND mr.month = ?
        )
    `).all(currentMonth).map(keysToCamel);

    // B. Invoices to generate (contracts with readings recorded this month, but no invoice yet)
    const invoicesToGenerate = this.db.prepare(`
      SELECT c.id as contract_id, c.room_id, r.room_number, t.name as tenant_name
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      JOIN meter_readings mr ON mr.room_id = c.room_id AND mr.month = ?
      WHERE c.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM invoices inv
          WHERE inv.contract_id = c.id AND inv.month = ?
        )
    `).all(currentMonth, currentMonth).map(keysToCamel);

    // C. Overdue invoices
    const overdueInvoices = this.db.prepare(`
      SELECT inv.id, inv.month, inv.total, inv.paid_amount, (inv.total - inv.paid_amount) as balance,
        inv.due_date, r.room_number, t.name as tenant_name, t.phone as tenant_phone
      FROM invoices inv
      JOIN contracts c ON inv.contract_id = c.id
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE inv.status = 'overdue' OR (inv.status IN ('unpaid', 'partial') AND inv.due_date < ?)
      ORDER BY inv.due_date ASC
    `).all(today).map(keysToCamel);

    // D. Contracts ending in 30 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const in30Days = futureDate.toISOString().split('T')[0];

    const expiringContracts = this.db.prepare(`
      SELECT c.id, c.end_date, r.room_number, t.name as tenant_name, t.phone as tenant_phone
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.status = 'active'
        AND c.end_date >= ? AND c.end_date <= ?
      ORDER BY c.end_date ASC
    `).all(today, in30Days).map(keysToCamel);

    // E. Open maintenance requests
    const openMaintenance = this.db.prepare(`
      SELECT m.id, m.description, m.status, m.created_at, r.room_number
      FROM maintenance_requests m
      JOIN rooms r ON m.room_id = r.id
      WHERE m.status IN ('open', 'in_progress')
      ORDER BY m.created_at DESC
    `).all().map(keysToCamel);

    // F. Pending room applications
    const pendingApplications = this.db.prepare(`
      SELECT a.id, a.room_id, a.tenant_id, a.move_in_date, a.created_at,
             r.room_number, r.floor, r.monthly_rent,
             t.name as tenant_name, t.phone as tenant_phone, t.id_number as tenant_id_number,
             t.telegram_chat_id
      FROM room_applications a
      JOIN rooms r ON a.room_id = r.id
      JOIN tenants t ON a.tenant_id = t.id
      WHERE a.status = 'pending'
      ORDER BY a.id DESC
    `).all().map(keysToCamel);

    // 4. 12-Month Financial Chart Data
    // Generates past 12 months array
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);

      const mIncome = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid_at LIKE ?
      `).get(`${mStr}%`).total;

      const mExpense = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE spent_at LIKE ?
      `).get(`${mStr}%`).total;

      chartData.push({
        month: mStr,
        income: mIncome / 100, // converted for charts
        expense: mExpense / 100,
        profit: (mIncome - mExpense) / 100,
        incomeCents: mIncome,
        expenseCents: mExpense,
        profitCents: mIncome - mExpense,
      });
    }

    // 5. Room Status Grid (All building rooms as colored clickable tiles)
    const roomGrid = this.db.prepare(`
      SELECT r.id, r.room_number, r.floor, r.status, r.monthly_rent,
        c.id as contract_id, t.name as tenant_name, t.phone as tenant_phone
      FROM rooms r
      LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.id
      ORDER BY r.floor ASC, r.room_number ASC
    `).all().map(keysToCamel);

    return {
      currentMonth,
      stats: {
        totalRooms,
        occupiedRooms,
        availableRooms: availableRoomsRow ? availableRoomsRow.count : 0,
        maintenanceRooms: maintenanceRoomsRow ? maintenanceRoomsRow.count : 0,
        occupancyRate,
        incomeThisMonth,
        expensesThisMonth,
        profitThisMonth,
        totalUnpaidBalance,
        pendingApplications: pendingApplicationsCount,
      },
      todayTasks: {
        pendingApplications,
        readingsMissing,
        invoicesToGenerate,
        overdueInvoices,
        expiringContracts,
        openMaintenance,
      },
      chartData,
      roomGrid,
    };
  }
}

export const dashboardService = new DashboardService();
