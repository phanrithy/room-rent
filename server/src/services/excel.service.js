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
