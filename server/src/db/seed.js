import bcrypt from 'bcrypt';
import { getDb } from './connection.js';
import { runMigrations } from './migrator.js';
import { generateInvoiceKhqr } from '../utils/khqr.js';

export async function seedDatabase(options = { demo: true, clean: false }) {
  const db = getDb();
  runMigrations(db);

  if (options.clean) {
    console.log('[Seed] Cleaning all data except schema...');
    db.transaction(() => {
      db.prepare('DELETE FROM audit_logs').run();
      db.prepare('DELETE FROM notifications').run();
      db.prepare('DELETE FROM documents').run();
      db.prepare('DELETE FROM maintenance_requests').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM payments').run();
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM meter_readings').run();
      db.prepare('DELETE FROM contracts').run();
      db.prepare('DELETE FROM room_applications').run();
      db.prepare('DELETE FROM tenants').run();
      db.prepare('DELETE FROM rooms').run();
      db.prepare('DELETE FROM properties').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM settings').run();
    })();
    console.log('[Seed] Database cleaned successfully.');
    return;
  }

  console.log('[Seed] Seeding settings and default admin...');

  // Default settings
  const defaultSettings = [
    { key: 'electric_price', value: '150' }, // 150 cents = $1.50
    { key: 'water_price', value: '50' },     // 50 cents = $0.50
    { key: 'due_day', value: '5' },
    { key: 'late_fee', value: '0' },
    { key: 'reminder_days_before', value: '3' },
    { key: 'company_name', value: 'Sunrise Apartments' },
    { key: 'currency', value: 'USD' },
    { key: 'exchange_rate', value: '4100' }, // 4100 KHR per USD
    { key: 'bakong_account_id', value: 'landlord@devb' },
    { key: 'merchant_name', value: 'Sunrise Apartments' },
    { key: 'merchant_city', value: 'Phnom Penh' },
  ];

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value);
    }
  })();

  // Admin user
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin#2026!';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, password_hash, role, language, theme, active)
      VALUES (?, ?, 'admin', 'en', 'system', 1)
    `).run('admin', passwordHash);
    console.log('====================================================');
    console.log('[Seed] Admin user created!');
    console.log('Username: admin');
    console.log(`Password: ${adminPassword}`);
    console.log('PLEASE CHANGE THIS PASSWORD ON YOUR FIRST LOGIN!');
    console.log('====================================================');
  }

  // Default property
  let property = db.prepare('SELECT id FROM properties LIMIT 1').get();
  if (!property) {
    const info = db.prepare(`
      INSERT INTO properties (name, address)
      VALUES (?, ?)
    `).run('Sunrise Apartments', 'Street 271, Boeng Tumpun, Mean Chey, Phnom Penh');
    property = { id: info.lastInsertRowid };
  }

  if (options.demo) {
    console.log('[Seed] Seeding demo data (rooms, tenants, contracts, readings, invoices, payments)...');

    db.transaction(() => {
      // 8 Rooms: 101, 102, 103, 104 (Floor 1), 201, 202, 203, 204 (Floor 2)
      const existingRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
      if (existingRooms.count === 0) {
        const insertRoom = db.prepare(`
          INSERT INTO rooms (property_id, room_number, floor, monthly_rent, status, note)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertRoom.run(property.id, '101', 1, 15000, 'available', 'Ground floor, street view'); // $150.00
        insertRoom.run(property.id, '102', 1, 15000, 'available', 'Ground floor, quiet corner');
        insertRoom.run(property.id, '103', 1, 16000, 'available', 'Air-conditioned room');
        insertRoom.run(property.id, '104', 1, 16000, 'maintenance', 'AC servicing in progress');
        insertRoom.run(property.id, '201', 2, 18000, 'available', 'Second floor balcony'); // $180.00
        insertRoom.run(property.id, '202', 2, 18000, 'available', 'Second floor balcony');
        insertRoom.run(property.id, '203', 2, 20000, 'available', 'Large corner room');
        insertRoom.run(property.id, '204', 2, 20000, 'available', 'Large corner room');
      }

      // 5 Tenants
      const existingTenants = db.prepare('SELECT COUNT(*) as count FROM tenants').get();
      if (existingTenants.count === 0) {
        const insertTenant = db.prepare(`
          INSERT INTO tenants (name, phone, id_number, email, telegram_chat_id, language)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const t1 = insertTenant.run('Sokha Chan', '012345678', 'ID01020304', 'sokha.chan@example.com', 'tg_sokha', 'km').lastInsertRowid;
        const t2 = insertTenant.run('Dara Vorn', '089123456', 'ID02030405', 'dara.vorn@example.com', 'tg_dara', 'km').lastInsertRowid;
        const t3 = insertTenant.run('Bopha Keo', '098765432', 'ID03040506', 'bopha.keo@example.com', 'tg_bopha', 'km').lastInsertRowid;
        const t4 = insertTenant.run('Rithy Phan', '017998877', 'ID04050607', 'rithy.phan@example.com', 'tg_rithy', 'en').lastInsertRowid;
        const t5 = insertTenant.run('Sreymom Chea', '092112233', 'ID05060708', 'sreymom.chea@example.com', 'tg_sreymom', 'km').lastInsertRowid;

        // Staff user and Tenant user for testing
        const staffHash = bcrypt.hashSync('Staff#2026!', saltRounds);
        db.prepare(`
          INSERT INTO users (username, password_hash, role, language, theme, active)
          VALUES ('staff', ?, 'staff', 'en', 'system', 1)
        `).run(staffHash);

        const tenantHash = bcrypt.hashSync('Tenant#2026!', saltRounds);
        db.prepare(`
          INSERT INTO users (username, password_hash, role, tenant_id, language, theme, active)
          VALUES ('sokha', ?, 'tenant', ?, 'km', 'system', 1)
        `).run(tenantHash, t1);

        // Fetch rooms
        const rooms = db.prepare('SELECT id, room_number, monthly_rent FROM rooms ORDER BY room_number').all();
        // Occupy rooms 101, 102, 103, 201, 202 with contracts
        const contractConfigs = [
          { room: rooms[0], tenantId: t1, deposit: 15000, rent: 15000 },
          { room: rooms[1], tenantId: t2, deposit: 15000, rent: 15000 },
          { room: rooms[2], tenantId: t3, deposit: 16000, rent: 16000 },
          { room: rooms[4], tenantId: t4, deposit: 18000, rent: 18000 },
          { room: rooms[5], tenantId: t5, deposit: 18000, rent: 18000 },
        ];

        const insertContract = db.prepare(`
          INSERT INTO contracts (room_id, tenant_id, start_date, end_date, deposit, rent_amount, status)
          VALUES (?, ?, '2026-08-01', '2027-08-01', ?, ?, 'active')
        `);
        const updateRoomStatus = db.prepare('UPDATE rooms SET status = ? WHERE id = ?');

        const activeContracts = [];
        for (const c of contractConfigs) {
          const cId = insertContract.run(c.room.id, c.tenantId, c.deposit, c.rent).lastInsertRowid;
          updateRoomStatus.run('occupied', c.room.id);
          activeContracts.push({ id: cId, ...c });
        }

        // Two months of meter readings and invoices: 2026-08 and 2026-09
        const insertReading = db.prepare(`
          INSERT INTO meter_readings (room_id, month, electric_prev, electric_current, water_prev, water_current)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertInvoice = db.prepare(`
          INSERT INTO invoices (contract_id, month, rent, electric_cost, water_cost, other_charges, late_fee, total, paid_amount, status, due_date, khqr_string, khqr_md5)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertPayment = db.prepare(`
          INSERT INTO payments (invoice_id, amount, method, paid_at, note, source)
          VALUES (?, ?, ?, ?, ?, 'manual')
        `);

        // Month 1: 2026-08 (all paid)
        for (let i = 0; i < activeContracts.length; i++) {
          const c = activeContracts[i];
          const ePrev = 100 + i * 20;
          const eCurr = ePrev + 50; // 50 units * 150 cents = 7500 cents ($75)
          const wPrev = 50 + i * 10;
          const wCurr = wPrev + 10; // 10 units * 50 cents = 500 cents ($5)
          insertReading.run(c.room.id, '2026-08', ePrev, eCurr, wPrev, wCurr);

          const eCost = (eCurr - ePrev) * 150;
          const wCost = (wCurr - wPrev) * 50;
          const total = c.rent + eCost + wCost;

          const invId = insertInvoice.run(
            c.id, '2026-08', c.rent, eCost, wCost, 0, 0, total, total, 'paid', '2026-09-05', null, null
          ).lastInsertRowid;

          insertPayment.run(invId, total, i % 2 === 0 ? 'cash' : 'qr', '2026-08-28', 'Paid on time');
        }

        // Month 2: 2026-09 (various statuses: paid, partial, unpaid, overdue)
        const statuses = ['paid', 'partial', 'unpaid', 'overdue', 'unpaid'];
        for (let i = 0; i < activeContracts.length; i++) {
          const c = activeContracts[i];
          const ePrev = 150 + i * 20;
          const eCurr = ePrev + 60; // 60 * 150 = 9000 cents ($90)
          const wPrev = 60 + i * 10;
          const wCurr = wPrev + 12; // 12 * 50 = 600 cents ($6)
          insertReading.run(c.room.id, '2026-09', ePrev, eCurr, wPrev, wCurr);

          const eCost = (eCurr - ePrev) * 150;
          const wCost = (wCurr - wPrev) * 50;
          const total = c.rent + eCost + wCost;
          const st = statuses[i];

          let paidAmt = 0;
          if (st === 'paid') paidAmt = total;
          else if (st === 'partial') paidAmt = Math.floor(total / 2);

          const balance = total - paidAmt;
          let qrString = null;
          let md5Hash = null;
          if (balance > 0) {
            const khqr = generateInvoiceKhqr({
              bakongAccountId: 'landlord@devb',
              merchantName: 'Sunrise Apartments',
              merchantCity: 'Phnom Penh',
              amountDollars: balance / 100,
              billNumber: `INV-202609-${c.room.roomNumber}`,
            });
            qrString = khqr.qr;
            md5Hash = khqr.md5;
          }

          const invId = insertInvoice.run(
            c.id, '2026-09', c.rent, eCost, wCost, 0, 0, total, paidAmt, st, '2026-10-05', qrString, md5Hash
          ).lastInsertRowid;

          if (paidAmt > 0) {
            insertPayment.run(invId, paidAmt, 'bank', '2026-09-25', 'Monthly payment');
          }
        }

        // A few expenses
        const insertExpense = db.prepare(`
          INSERT INTO expenses (property_id, room_id, category, amount, spent_at, note)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertExpense.run(property.id, null, 'cleaning', 5000, '2026-08-15', 'Monthly common area cleaning'); // $50
        insertExpense.run(property.id, rooms[3].id, 'repair', 12000, '2026-09-10', 'Air conditioner maintenance & gas refill'); // $120
        insertExpense.run(property.id, null, 'utilities', 3500, '2026-09-15', 'Stairway and security lighting'); // $35
      }
    })();
  }

  console.log('[Seed] Database initialization complete.');
}

if (process.argv[1] === (await import('url')).fileURLToPath(import.meta.url)) {
  const isClean = process.argv.includes('--clean');
  const noDemo = process.argv.includes('--no-demo');
  seedDatabase({ demo: !noDemo, clean: isClean })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    });
}
