import { exportInvoicesToExcel, exportPaymentsToExcel } from '../services/excel.service.js';

export async function exportInvoices(req, res, next) {
  try {
    const month = req.query.month || null;
    const buffer = await exportInvoicesToExcel(month);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoices-${month || 'all'}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportPayments(req, res, next) {
  try {
    const month = req.query.month || null;
    const buffer = await exportPaymentsToExcel(month);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments-${month || 'all'}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
