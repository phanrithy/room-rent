import { readingService } from '../services/reading.service.js';

export function getReadingSheet(req, res, next) {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const sheet = readingService.getReadingSheet(month);
    res.json({ sheet });
  } catch (err) {
    next(err);
  }
}

export function saveReadings(req, res, next) {
  try {
    const { month, readings } = req.body;
    const sheet = readingService.saveReadings(req.user.id, month, readings);
    res.json({ sheet });
  } catch (err) {
    next(err);
  }
}
