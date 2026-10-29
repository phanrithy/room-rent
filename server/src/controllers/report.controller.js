import {
  exportInvoicesToExcel,
  exportPaymentsToExcel,
  exportMonthlyReportToExcel,
  exportYearlyReportToExcel,
} from '../services/excel.service.js';
import { reportService } from '../services/report.service.js';

export function getMonthlyReport(req, res, next) {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const report = reportService.getMonthlyReport(month);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export function getYearlyReport(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    const report = reportService.getYearlyReport(year);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

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

export async function exportMonthlyReport(req, res, next) {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const buffer = await exportMonthlyReportToExcel(month);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${month}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportYearlyReport(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    const buffer = await exportYearlyReportToExcel(year);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="annual-report-${year}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
