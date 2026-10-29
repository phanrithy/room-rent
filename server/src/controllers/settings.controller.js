import { settingsService } from '../services/settings.service.js';
import { propertyRepository } from '../repositories/property.repository.js';
import { roomRepository } from '../repositories/room.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { seedDatabase } from '../db/seed.js';
import { getDb } from '../db/connection.js';

export function getSettings(req, res, next) {
  try {
    const settings = settingsService.getSettings();
    const property = propertyRepository.findFirst();
    res.json({ settings, property });
  } catch (err) {
    next(err);
  }
}

export function updateSettings(req, res, next) {
  try {
    const { property, ...settingsUpdates } = req.body;

    if (property && property.name) {
      const currentProp = propertyRepository.findFirst();
      if (currentProp) {
        propertyRepository.update(currentProp.id, {
          name: property.name,
          address: property.address,
        });
      }
    }

    const updated = settingsService.updateSettings(req.user.id, settingsUpdates);
    res.json({ settings: updated });
  } catch (err) {
    next(err);
  }
}

export async function runOnboarding(req, res, next) {
  try {
    const {
      buildingName,
      buildingAddress,
      numberOfRooms,
      floorsCount,
      defaultRentCents,
      electricPrice,
      waterPrice,
      dueDay,
      bakongAccountId,
      merchantName,
      merchantCity,
      language,
      theme,
      loadDemoData,
    } = req.body;

    const db = getDb();

    if (loadDemoData) {
      await seedDatabase({ demo: true, clean: true });
      return res.json({ success: true, message: 'Demo data loaded successfully' });
    }

    db.transaction(() => {
      // 1. Setup property
      const currentProp = propertyRepository.findFirst();
      let propId;
      if (currentProp) {
        propertyRepository.update(currentProp.id, {
          name: buildingName || 'Sunrise Apartments',
          address: buildingAddress || 'Phnom Penh, Cambodia',
        });
        propId = currentProp.id;
      } else {
        propId = propertyRepository.create({
          name: buildingName || 'Sunrise Apartments',
          address: buildingAddress || 'Phnom Penh, Cambodia',
        });
      }

      // 2. Bulk create rooms
      const numRooms = parseInt(numberOfRooms || '8', 10);
      const floors = parseInt(floorsCount || '2', 10);
      const roomsPerFloor = Math.ceil(numRooms / floors);
      const rent = parseInt(defaultRentCents || '15000', 10);

      let createdCount = 0;
      for (let f = 1; f <= floors; f++) {
        for (let r = 1; r <= roomsPerFloor; r++) {
          if (createdCount >= numRooms) break;
          const roomNumber = `${f}${String(r).padStart(2, '0')}`;
          const existing = roomRepository.findByNumber(propId, roomNumber);
          if (!existing) {
            roomRepository.create({
              propertyId: propId,
              roomNumber,
              floor: f,
              monthlyRent: rent,
              status: 'available',
            });
            createdCount++;
          }
        }
      }

      // 3. Save settings
      const settingsMap = {
        electric_price: String(electricPrice || '150'),
        water_price: String(waterPrice || '50'),
        due_day: String(dueDay || '5'),
        bakong_account_id: bakongAccountId || 'landlord@devb',
        merchant_name: merchantName || buildingName || 'Sunrise Apartments',
        merchant_city: merchantCity || 'Phnom Penh',
        onboarding_completed: 'true',
      };
      settingsService.updateSettings(req.user.id, settingsMap);

      // 4. Update user preference
      if (language || theme) {
        userRepository.updatePreferences(req.user.id, { language, theme });
      }

      auditRepository.create({
        userId: req.user.id,
        action: 'RUN_ONBOARDING',
        tableName: 'settings',
        recordId: null,
        detail: { buildingName, numRooms, createdCount },
      });
    })();

    res.json({ success: true, message: 'Onboarding completed successfully' });
  } catch (err) {
    next(err);
  }
}
