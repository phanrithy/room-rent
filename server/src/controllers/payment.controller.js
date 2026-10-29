import { paymentService } from '../services/payment.service.js';

export function listPayments(req, res, next) {
  try {
    const result = paymentService.listPayments(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getPayment(req, res, next) {
  try {
    const payment = paymentService.getPayment(req.user, parseInt(req.params.id, 10));
    res.json({ payment });
  } catch (err) {
    next(err);
  }
}

export function addPayment(req, res, next) {
  try {
    const result = paymentService.addPayment(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
