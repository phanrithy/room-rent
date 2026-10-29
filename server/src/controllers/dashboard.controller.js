import { dashboardService } from '../services/dashboard.service.js';

export function getDashboard(req, res, next) {
  try {
    const data = dashboardService.getDashboardData();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
