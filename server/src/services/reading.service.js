import { getDb } from '../db/connection.js';
import { readingRepository } from '../repositories/reading.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { BadRequestError } from '../utils/errors.js';

export class ReadingService {
  /**
   * Get sheet for a month with pricing estimate
   */
  getReadingSheet(month) {
    const rawSheet = readingRepository.getSheetForMonth(month);
    const electricPrice = parseInt(settingsRepository.get('electric_price', '150'), 10);
    const waterPrice = parseInt(settingsRepository.get('water_price', '50'), 10);

    return rawSheet.map((row) => {
      let electricUnits = 0;
      let waterUnits = 0;
      let estimatedCost = 0;
      let isInvalid = false;

      if (row.electricCurrent !== null && row.electricCurrent !== undefined) {
        if (row.electricCurrent < row.electricPrev) {
          isInvalid = true;
        } else {
          electricUnits = row.electricCurrent - row.electricPrev;
        }
      }

      if (row.waterCurrent !== null && row.waterCurrent !== undefined) {
        if (row.waterCurrent < row.waterPrev) {
          isInvalid = true;
        } else {
          waterUnits = row.waterCurrent - row.waterPrev;
        }
      }

      estimatedCost = electricUnits * electricPrice + waterUnits * waterPrice;

      return {
        ...row,
        electricUnits,
        waterUnits,
        electricPrice,
        waterPrice,
        estimatedCost,
        isInvalid,
      };
    });
  }

  /**
   * Save array of meter readings for a month
   */
  saveReadings(userId, month, readings) {
    const db = getDb();

    // Validate all inputs before running transaction
    for (const r of readings) {
      if (r.electricCurrent < r.electricPrev) {
        throw new BadRequestError(
          `Room ${r.roomNumber || r.roomId}: Current electric reading (${r.electricCurrent}) cannot be less than previous (${r.electricPrev})`,
          'READING_LESS_THAN_PREV',
          { roomId: r.roomId, type: 'electric' }
        );
      }
      if (r.waterCurrent < r.waterPrev) {
        throw new BadRequestError(
          `Room ${r.roomNumber || r.roomId}: Current water reading (${r.waterCurrent}) cannot be less than previous (${r.waterPrev})`,
          'READING_LESS_THAN_PREV',
          { roomId: r.roomId, type: 'water' }
        );
      }
    }

    const execute = db.transaction(() => {
      for (const r of readings) {
        readingRepository.saveReading({
          roomId: r.roomId,
          month,
          electricPrev: r.electricPrev,
          electricCurrent: r.electricCurrent,
          waterPrev: r.waterPrev,
          waterCurrent: r.waterCurrent,
        });
      }

      auditRepository.create({
        userId,
        action: 'SAVE_METER_READINGS',
        tableName: 'meter_readings',
        recordId: null,
        detail: { month, count: readings.length },
      });
    });

    execute();
    return this.getReadingSheet(month);
  }
}

export const readingService = new ReadingService();
