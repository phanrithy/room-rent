import { getDb } from '../db/connection.js';
import { keysToCamel } from '../utils/case.js';

export class ReadingRepository {
  /**
   * @param {import('better-sqlite3').Database} [db]
   */
  constructor(db) {
    this.db = db || getDb();
  }

  /**
   * Find reading for a specific room and month
   */
  findByRoomAndMonth(roomId, month) {
    const row = this.db.prepare(`
      SELECT * FROM meter_readings WHERE room_id = ? AND month = ?
    `).get(roomId, month);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Get latest reading for a room strictly before a specified month
   */
  getLatestBeforeMonth(roomId, month) {
    const row = this.db.prepare(`
      SELECT * FROM meter_readings
      WHERE room_id = ? AND month < ?
      ORDER BY month DESC
      LIMIT 1
    `).get(roomId, month);
    return row ? keysToCamel(row) : null;
  }

  /**
   * Get reading sheet for an entire building for a given month
   * Pre-fills previous values from the latest earlier reading if available
   */
  getSheetForMonth(month) {
    const rooms = this.db.prepare(`
      SELECT r.id as room_id, r.room_number, r.floor, r.status as room_status,
        c.id as contract_id, t.name as tenant_name
      FROM rooms r
      LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.id
      ORDER BY r.floor ASC, r.room_number ASC
    `).all();

    return rooms.map((r) => {
      const existing = this.findByRoomAndMonth(r.room_id, month);
      let electricPrev = 0;
      let waterPrev = 0;
      let electricCurrent = null;
      let waterCurrent = null;
      let readingId = null;

      if (existing) {
        readingId = existing.id;
        electricPrev = existing.electricPrev;
        electricCurrent = existing.electricCurrent;
        waterPrev = existing.waterPrev;
        waterCurrent = existing.waterCurrent;
      } else {
        const lastEarlier = this.getLatestBeforeMonth(r.room_id, month);
        if (lastEarlier) {
          electricPrev = lastEarlier.electricCurrent;
          waterPrev = lastEarlier.waterCurrent;
        }
      }

      return {
        ...keysToCamel(r),
        readingId,
        month,
        electricPrev,
        electricCurrent,
        waterPrev,
        waterCurrent,
        isRecorded: !!existing,
      };
    });
  }

  /**
   * Upsert reading (insert or update if same room and month)
   */
  saveReading({ roomId, month, electricPrev, electricCurrent, waterPrev, waterCurrent }) {
    const stmt = this.db.prepare(`
      INSERT INTO meter_readings (room_id, month, electric_prev, electric_current, water_prev, water_current)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_id, month) DO UPDATE SET
        electric_prev = excluded.electric_prev,
        electric_current = excluded.electric_current,
        water_prev = excluded.water_prev,
        water_current = excluded.water_current
    `);
    const info = stmt.run(roomId, month, electricPrev, electricCurrent, waterPrev, waterCurrent);
    return info.lastInsertRowid;
  }

  /**
   * Delete reading
   */
  deleteReading(id) {
    this.db.prepare('DELETE FROM meter_readings WHERE id = ?').run(id);
  }
}

export const readingRepository = new ReadingRepository();
