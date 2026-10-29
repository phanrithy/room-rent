import ExcelJS from 'exceljs';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';

export async function exportInvoicesToExcel(month = null) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoices');

  worksheet.columns = [
    { header: 'Invoice #', key: 'invoiceNo', width: 18 },
    { header: 'Room #', key: 'roomNumber', width: 12 },
    { header: 'Tenant Name', key: 'tenantName', width: 22 },
    { header: 'Phone', key: 'tenantPhone', width: 16 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Rent ($)', key: 'rent', width: 12 },
    { header: 'Electric ($)', key: 'electricCost', width: 14 },
    { header: 'Water ($)', key: 'waterCost', width: 12 },
    { header: 'Extra Charges ($)', key: 'otherCharges', width: 16 },
    { header: 'Late Fee ($)', key: 'lateFee', width: 12 },
    { header: 'Total ($)', key: 'total', width: 14 },
    { header: 'Paid ($)', key: 'paidAmount', width: 14 },
    { header: 'Balance ($)', key: 'balance', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const { items } = invoiceRepository.findAndCountAll({
    month: month || undefined,
    pageSize: 1000,
  });

  for (const inv of items) {
    worksheet.addRow({
      invoiceNo: `INV-${inv.month.replace('-', '')}-${inv.roomNumber}`,
      roomNumber: inv.roomNumber,
      tenantName: inv.tenantName,
      tenantPhone: inv.tenantPhone,
      month: inv.month,
      dueDate: inv.dueDate,
      rent: (inv.rent / 100).toFixed(2),
      electricCost: (inv.electricCost / 100).toFixed(2),
      waterCost: (inv.waterCost / 100).toFixed(2),
      otherCharges: (inv.otherCharges / 100).toFixed(2),
      lateFee: (inv.lateFee / 100).toFixed(2),
      total: (inv.total / 100).toFixed(2),
      paidAmount: (inv.paidAmount / 100).toFixed(2),
      balance: ((inv.total - inv.paidAmount) / 100).toFixed(2),
      status: inv.status.toUpperCase(),
    });
  }

  return await workbook.xlsx.writeBuffer();
}

export async function exportPaymentsToExcel(month = null) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payments');

  worksheet.columns = [
    { header: 'Receipt #', key: 'receiptNo', width: 16 },
    { header: 'Payment Date', key: 'paidAt', width: 18 },
    { header: 'Room #', key: 'roomNumber', width: 12 },
    { header: 'Tenant Name', key: 'tenantName', width: 22 },
    { header: 'Amount ($)', key: 'amount', width: 14 },
    { header: 'Method', key: 'method', width: 14 },
    { header: 'Source', key: 'source', width: 14 },
    { header: 'Invoice Month', key: 'month', width: 14 },
    { header: 'Note', key: 'note', width: 24 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF16A34A' },
  };

  const { items } = paymentRepository.findAndCountAll({
    pageSize: 1000,
  });

  for (const p of items) {
    worksheet.addRow({
      receiptNo: `REC-${String(p.id).padStart(5, '0')}`,
      paidAt: p.paidAt ? p.paidAt.split('T')[0] : '',
      roomNumber: p.roomNumber,
      tenantName: p.tenantName,
      amount: (p.amount / 100).toFixed(2),
      method: p.method.toUpperCase(),
      source: p.source,
      month: p.month,
      note: p.note || '',
    });
  }

  return await workbook.xlsx.writeBuffer();
}

export async function exportMonthlyReportToExcel(month) {
  const { reportService } = await import('./report.service.js');
  const report = reportService.getMonthlyReport(month);

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet(`Summary - ${month}`);

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value ($ / %)', key: 'val', width: 20 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  summarySheet.addRows([
    { metric: 'Billing Month', val: month },
    { metric: 'Invoices Generated', val: report.billed.invoiceCount },
    { metric: 'Total Rent Billed ($)', val: (report.billed.rent / 100).toFixed(2) },
    { metric: 'Total Electricity Billed ($)', val: (report.billed.electric / 100).toFixed(2) },
    { metric: 'Total Water Billed ($)', val: (report.billed.water / 100).toFixed(2) },
    { metric: 'Total Extra Charges ($)', val: (report.billed.otherCharges / 100).toFixed(2) },
    { metric: 'Total Late Fees ($)', val: (report.billed.lateFee / 100).toFixed(2) },
    { metric: 'Total Billed ($)', val: (report.billed.total / 100).toFixed(2) },
    { metric: 'Actual Revenue Collected ($)', val: (report.cashFlow.revenue / 100).toFixed(2) },
    { metric: 'Total Operating Expenses ($)', val: (report.cashFlow.expenses / 100).toFixed(2) },
    { metric: 'Net Operating Profit ($)', val: (report.cashFlow.netProfit / 100).toFixed(2) },
    { metric: 'Occupancy Rate (%)', val: `${report.occupancy.rate}%` },
  ]);

  const expenseSheet = workbook.addWorksheet('Expense Breakdown');
  expenseSheet.columns = [
    { header: 'Expense Category', key: 'cat', width: 25 },
    { header: 'Total Spent ($)', key: 'amount', width: 18 },
    { header: 'Count', key: 'count', width: 12 },
  ];
  expenseSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  expenseSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' },
  };

  for (const c of report.cashFlow.expenseCategories) {
    expenseSheet.addRow({
      cat: c.category.toUpperCase(),
      amount: (c.totalAmount / 100).toFixed(2),
      count: c.count,
    });
  }

  return await workbook.xlsx.writeBuffer();
}

export async function exportYearlyReportToExcel(year) {
  const { reportService } = await import('./report.service.js');
  const report = reportService.getYearlyReport(year);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Annual - ${year}`);

  worksheet.columns = [
    { header: 'Month', key: 'month', width: 14 },
    { header: 'Billed Total ($)', key: 'billed', width: 18 },
    { header: 'Revenue Collected ($)', key: 'revenue', width: 22 },
    { header: 'Operating Expenses ($)', key: 'expenses', width: 22 },
    { header: 'Net Profit ($)', key: 'profit', width: 18 },
    { header: 'Occupancy Rate (%)', key: 'occupancy', width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  for (const m of report.months) {
    worksheet.addRow({
      month: m.month,
      billed: (m.billedTotal / 100).toFixed(2),
      revenue: (m.revenue / 100).toFixed(2),
      expenses: (m.expenses / 100).toFixed(2),
      profit: (m.netProfit / 100).toFixed(2),
      occupancy: `${m.occupancyRate}%`,
    });
  }

  // Summary Row
  const sumRow = worksheet.addRow({
    month: 'ANNUAL TOTAL',
    billed: '',
    revenue: (report.annualRevenue / 100).toFixed(2),
    expenses: (report.annualExpenses / 100).toFixed(2),
    profit: (report.annualNetProfit / 100).toFixed(2),
    occupancy: '',
  });
  sumRow.font = { bold: true };

  return await workbook.xlsx.writeBuffer();
}
