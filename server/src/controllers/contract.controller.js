import { contractService } from '../services/contract.service.js';

export function listContracts(req, res, next) {
  try {
    const result = contractService.listContracts(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getContract(req, res, next) {
  try {
    const contract = contractService.getContract(req.user, parseInt(req.params.id, 10));
    res.json({ contract });
  } catch (err) {
    next(err);
  }
}

export function createContract(req, res, next) {
  try {
    const contract = contractService.createContract(req.user.id, req.body);
    res.status(201).json({ contract, tenantAccount: contract.tenantAccount });
  } catch (err) {
    next(err);
  }
}

export function calculateMoveOut(req, res, next) {
  try {
    const damageCharges = req.query.damageCharges ? parseInt(req.query.damageCharges, 10) : 0;
    const settlement = contractService.calculateMoveOut(parseInt(req.params.id, 10), damageCharges);
    res.json({ settlement });
  } catch (err) {
    next(err);
  }
}

export function endContract(req, res, next) {
  try {
    const result = contractService.endContract(req.user.id, parseInt(req.params.id, 10), req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
