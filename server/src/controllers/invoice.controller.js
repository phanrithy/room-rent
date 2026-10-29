import { invoiceService } from '../services/invoice.service.js';

export function listInvoices(req, res, next) {
  try {
    const result = invoiceService.listInvoices(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getInvoice(req, res, next) {
  try {
    const invoice = invoiceService.getInvoice(req.user, parseInt(req.params.id, 10));
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

export async function getInvoicePdf(req, res, next) {
  try {
    const invoice = invoiceService.getInvoice(req.user, parseInt(req.params.id, 10));
    const { generateInvoicePdf } = await import('../services/pdf.service.js');
    const buffer = await generateInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.month}-${invoice.roomNumber}.pdf"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export function generateInvoices(req, res, next) {
  try {
    const { month } = req.body;
    const result = invoiceService.generateInvoices(req.user.id, month);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function addExtraCharge(req, res, next) {
  try {
    const invoice = invoiceService.addExtraCharge(
      req.user.id,
      parseInt(req.params.id, 10),
      req.body
    );
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

export function removeExtraCharge(req, res, next) {
  try {
    const invoice = invoiceService.removeExtraCharge(
      req.user.id,
      parseInt(req.params.id, 10),
      parseInt(req.params.itemId, 10)
    );
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

export function checkOverdue(req, res, next) {
  try {
    const result = invoiceService.checkOverdue(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
