import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';
import { calculateInvoice, calculateDueDate } from '../src/services/invoice.service.js';
import { contractService } from '../src/services/contract.service.js';
import { paymentService } from '../src/services/payment.service.js';
import { readingService } from '../src/services/reading.service.js';

describe('Phase 3: Core Financial & Business Rules', () => {
  let server;
  let baseUrl;
  let adminToken;

  before(async () => {
    await seedDatabase({ demo: true });
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    const resAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin#2026!' }),
    });
    adminToken = (await resAdmin.json()).token;
  });

  after(() => {
    server.close();
    closeDb();
  });

  // 1. Pure calculateInvoice
  test('calculateInvoice computes rent + electric + water + extra + late fee correctly in integer cents', () => {
    // Rent: $150.00 (15000 cents)
    // Electric: 50 units * 150 cents = 7500 cents ($75.00)
    // Water: 10 units * 50 cents = 500 cents ($5.00)
    // Extra: 1000 cents ($10.00)
    // Late fee: 500 cents ($5.00)
    const result = calculateInvoice({
      rent: 15000,
      electricUnits: 50,
      electricPrice: 150,
      waterUnits: 10,
      waterPrice: 50,
      extraCharges: 1000,
      lateFee: 500,
    });

    assert.strictEqual(result.electricCost, 7500);
    assert.strictEqual(result.waterCost, 500);
    assert.strictEqual(result.total, 24500); // $245.00
  });

  // 2. Pure calculateDueDate
  test('calculateDueDate rolls over correctly to next month due day', () => {
    assert.strictEqual(calculateDueDate('2026-08', 5), '2026-09-05');
    assert.strictEqual(calculateDueDate('2026-12', 5), '2027-01-05');
    assert.strictEqual(calculateDueDate('2026-01', 15), '2026-02-15');
  });

  // 3. Contract Room-Status Transitions
  test('Contract creation sets room to occupied; ending it frees room to available', async () => {
    const db = getDb();

    // Pick an available room (room 203)
    const room = db.prepare("SELECT * FROM rooms WHERE status = 'available' LIMIT 1").get();
    assert.ok(room, 'Must have at least one available room');

    const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();

    // Create contract
    const contract = contractService.createContract(1, {
      roomId: room.id,
      tenantId: tenant.id,
      startDate: '2026-11-01',
      endDate: '2027-11-01',
      deposit: 20000,
      rentAmount: 20000,
    });

    // Verify room is now occupied
    const occupiedRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(room.id);
    assert.strictEqual(occupiedRoom.status, 'occupied');

    // Attempting to create another contract on the occupied room must fail with ROOM_NOT_AVAILABLE
    assert.throws(
      () => {
        contractService.createContract(1, {
          roomId: room.id,
          tenantId: tenant.id,
          startDate: '2026-11-01',
          endDate: '2027-11-01',
        });
      },
      (err) => err.code === 'ROOM_NOT_AVAILABLE'
    );

    // End contract
    const endRes = contractService.endContract(1, contract.id);
    assert.strictEqual(endRes.success, true);

    // Verify room is now available again
    const availableRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(room.id);
    assert.strictEqual(availableRoom.status, 'available');
  });

  // 4. Move-out Settlement Calculation
  test('Deposit refund calculation returns correct refund and stillOwed values', () => {
    // Case A: Deposit ($200) > Unpaid ($50) + Damages ($30) => Balance = +$120 => Refund = $120, StillOwed = $0
    const db = getDb();
    const contract = db.prepare('SELECT id FROM contracts WHERE status = \'active\' LIMIT 1').get();

    const settlementA = contractService.calculateMoveOut(contract.id, 0);
    assert.ok(settlementA.deposit >= 0);
    assert.strictEqual(settlementA.refund, Math.max(settlementA.balance, 0));
    assert.strictEqual(settlementA.stillOwed, Math.max(-settlementA.balance, 0));

    // Case B: Huge damage charge exceeding deposit
    const settlementB = contractService.calculateMoveOut(contract.id, 999999);
    assert.strictEqual(settlementB.refund, 0);
    assert.ok(settlementB.stillOwed > 0);
    assert.strictEqual(settlementB.stillOwed, -settlementB.balance);
  });

  // 5. Meter Readings Rules
  test('Saving readings rejects when current is strictly less than previous', () => {
    assert.throws(
      () => {
        readingService.saveReadings(1, '2026-10', [
          {
            roomId: 1,
            electricPrev: 100,
            electricCurrent: 90, // INVALID: 90 < 100
            waterPrev: 50,
            waterCurrent: 60,
          },
        ]);
      },
      (err) => err.code === 'READING_LESS_THAN_PREV'
    );
  });

  // 6. Payment Status Rules & Balance Tracking
  test('Payment rules: partial payment -> partial; full payment -> paid; overpayment rejected', async () => {
    const db = getDb();

    // Create a standalone unpaid invoice for testing
    const contract = db.prepare("SELECT id, room_id FROM contracts WHERE status = 'active' LIMIT 1").get();
    db.prepare("DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE contract_id = ? AND month = '2099-11')").run(contract.id);
    db.prepare("DELETE FROM invoices WHERE contract_id = ? AND month = '2099-11'").run(contract.id);

    const invId = db.prepare(`
      INSERT INTO invoices (contract_id, month, rent, electric_cost, water_cost, total, paid_amount, status, due_date)
      VALUES (?, '2099-11', 10000, 2000, 1000, 13000, 0, 'unpaid', '2099-12-05')
    `).run(contract.id).lastInsertRowid;

    // Step A: Overpayment attempt ($150 on $130 balance) must fail
    assert.throws(
      () => {
        paymentService.addPayment(1, {
          invoiceId: invId,
          amount: 15000, // > 13000
          method: 'cash',
        });
      },
      (err) => err.code === 'PAYMENT_EXCEEDS_BALANCE'
    );

    // Step B: Partial payment of $50 (5000 cents)
    const partialRes = paymentService.addPayment(1, {
      invoiceId: invId,
      amount: 5000,
      method: 'cash',
    });
    assert.strictEqual(partialRes.invoice.paidAmount, 5000);
    assert.strictEqual(partialRes.invoice.status, 'partial');
    assert.ok(partialRes.invoice.khqrString, 'Partial payment must regenerate KHQR string for remaining balance');

    // Step C: Pay remaining balance of $80 (8000 cents)
    const fullRes = paymentService.addPayment(1, {
      invoiceId: invId,
      amount: 8000,
      method: 'qr',
    });
    assert.strictEqual(fullRes.invoice.paidAmount, 13000);
    assert.strictEqual(fullRes.invoice.status, 'paid');

    // Step D: Attempting payment on already paid invoice must fail
    assert.throws(
      () => {
        paymentService.addPayment(1, {
          invoiceId: invId,
          amount: 1000,
          method: 'bank',
        });
      },
      (err) => err.code === 'INVOICE_ALREADY_PAID'
    );
  });

  // 7. API End-to-End Invoice Generation & Overdue Check
  test('POST /api/invoices/generate skips contracts without readings or with existing invoice', async () => {
    const res = await fetch(`${baseUrl}/api/invoices/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ month: '2026-08' }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.skipped));
    // Since 2026-08 was seeded, active contracts should be reported as ALREADY_EXISTS
    for (const s of data.skipped) {
      assert.strictEqual(s.reason, 'ALREADY_EXISTS');
    }
  });
});
