import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Phase 6: Money Tracking, Expenses, Reports, CSV Import', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let createdExpenseId;

  const cleanupTestData = (db) => {
    const tIds = db.prepare("SELECT id FROM tenants WHERE name IN ('Kosal Heng', 'Sreymom Pich')").all().map((t) => t.id);
    for (const tid of tIds) {
      const cIds = db.prepare("SELECT id FROM contracts WHERE tenant_id = ?").all(tid).map((c) => c.id);
      for (const cid of cIds) {
        const invIds = db.prepare("SELECT id FROM invoices WHERE contract_id = ?").all(cid).map((i) => i.id);
        for (const invId of invIds) {
          db.prepare("DELETE FROM notifications WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM payments WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM invoices WHERE id = ?").run(invId);
        }
        db.prepare("DELETE FROM documents WHERE contract_id = ?").run(cid);
        db.prepare("DELETE FROM contracts WHERE id = ?").run(cid);
      }
      db.prepare("DELETE FROM documents WHERE tenant_id = ?").run(tid);
      db.prepare("DELETE FROM users WHERE tenant_id = ?").run(tid);
      db.prepare("DELETE FROM room_applications WHERE tenant_id = ?").run(tid);
      db.prepare("DELETE FROM tenants WHERE id = ?").run(tid);
    }

    const rIds = db.prepare("SELECT id FROM rooms WHERE room_number IN ('901', '902')").all().map((r) => r.id);
    for (const rid of rIds) {
      db.prepare("DELETE FROM maintenance_requests WHERE room_id = ?").run(rid);
      db.prepare("DELETE FROM meter_readings WHERE room_id = ?").run(rid);
      const cIds = db.prepare("SELECT id FROM contracts WHERE room_id = ?").all(rid).map((c) => c.id);
      for (const cid of cIds) {
        const invIds = db.prepare("SELECT id FROM invoices WHERE contract_id = ?").all(cid).map((i) => i.id);
        for (const invId of invIds) {
          db.prepare("DELETE FROM notifications WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM payments WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(invId);
          db.prepare("DELETE FROM invoices WHERE id = ?").run(invId);
        }
        db.prepare("DELETE FROM documents WHERE contract_id = ?").run(cid);
        db.prepare("DELETE FROM contracts WHERE id = ?").run(cid);
      }
      db.prepare("DELETE FROM room_applications WHERE room_id = ?").run(rid);
      db.prepare("DELETE FROM expenses WHERE room_id = ?").run(rid);
      db.prepare("DELETE FROM rooms WHERE id = ?").run(rid);
    }
  };

  before(async () => {
    const db = (await import('../src/db/connection.js')).getDb();
    try {
      cleanupTestData(db);
      await seedDatabase({ demo: true });
    } catch (err) {
      console.error('*** ERROR IN PHASE 6 BEFORE HOOK ***:', err);
      throw err;
    }
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

    const resStaff = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'Staff#2026!' }),
    });
    staffToken = (await resStaff.json()).token;
  });

  after(async () => {
    try {
      const db = (await import('../src/db/connection.js')).getDb();
      cleanupTestData(db);
    } catch {
      // quiet cleanup
    }
    server.close();
    closeDb();
  });

  test('POST /api/expenses records an expense with audit log', async () => {
    const res = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category: 'repair',
        amount: 3500, // $35.00
        spentAt: '2026-10-15',
        note: 'Replaced kitchen sink pipe',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.expense);
    assert.strictEqual(data.expense.category, 'repair');
    assert.strictEqual(data.expense.amount, 3500);
    assert.strictEqual(data.expense.spentAt, '2026-10-15');
    createdExpenseId = data.expense.id;
  });

  test('GET /api/expenses lists expenses and filters by category', async () => {
    const res = await fetch(`${baseUrl}/api/expenses?category=repair`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].category, 'repair');
  });

  test('GET /api/expenses/summary aggregates spending by category', async () => {
    const res = await fetch(`${baseUrl}/api/expenses/summary?month=2026-10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.categories));
    assert.ok(typeof data.totalSpent === 'number');
    assert.ok(data.totalSpent >= 3500);
  });

  test('Staff can record expense but cannot delete expense', async () => {
    // Staff records
    const resCreate = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        category: 'cleaning',
        amount: 1500,
        spentAt: '2026-10-16',
        note: 'Hallway cleaning supplies',
      }),
    });
    assert.strictEqual(resCreate.status, 201);
    const staffExpenseId = (await resCreate.json()).expense.id;

    // Staff tries to delete
    const resDel = await fetch(`${baseUrl}/api/expenses/${staffExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(resDel.status, 403);

    // Admin can delete
    const resAdminDel = await fetch(`${baseUrl}/api/expenses/${staffExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdminDel.status, 200);
  });

  test('GET /api/reports/monthly returns billed, cashFlow, and net profit', async () => {
    const res = await fetch(`${baseUrl}/api/reports/monthly?month=2099-11`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.billed);
    assert.ok(data.cashFlow);
    assert.ok(data.occupancy);
    assert.strictEqual(typeof data.cashFlow.netProfit, 'number');
    assert.strictEqual(
      data.cashFlow.netProfit,
      data.cashFlow.revenue - data.cashFlow.expenses
    );
  });

  test('GET /api/reports/yearly returns 12-month summary and annual totals', async () => {
    const res = await fetch(`${baseUrl}/api/reports/yearly?year=2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.year, 2026);
    assert.strictEqual(data.months.length, 12);
    assert.strictEqual(
      data.annualNetProfit,
      data.annualRevenue - data.annualExpenses
    );
  });

  test('GET /api/reports/export/monthly and yearly return valid Excel buffers', async () => {
    const resM = await fetch(`${baseUrl}/api/reports/export/monthly?month=2026-10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resM.status, 200);
    assert.strictEqual(
      resM.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const bufM = await resM.arrayBuffer();
    assert.ok(bufM.byteLength > 1000);

    const resY = await fetch(`${baseUrl}/api/reports/export/yearly?year=2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resY.status, 200);
    const bufY = await resY.arrayBuffer();
    assert.ok(bufY.byteLength > 1000);
  });

  test('POST /api/rooms/import bulk imports rooms from validated CSV payload', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          { roomNumber: '901', floor: 9, monthlyRent: 18000, note: 'Penthouse A' },
          { roomNumber: '902', floor: 9, monthlyRent: 19000, note: 'Penthouse B' },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.imported, 2);
    assert.strictEqual(data.errors.length, 0);

    // Duplicate import skips with friendly error
    const resDup = await fetch(`${baseUrl}/api/rooms/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          { roomNumber: '901', floor: 9, monthlyRent: 18000 },
        ],
      }),
    });
    const dataDup = await resDup.json();
    assert.strictEqual(dataDup.imported, 0);
    assert.strictEqual(dataDup.errors.length, 1);
    assert.match(dataDup.errors[0].error, /already exists/);
  });

  test('POST /api/tenants/import bulk imports tenants from validated CSV payload', async () => {
    const res = await fetch(`${baseUrl}/api/tenants/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rows: [
          { name: 'Kosal Heng', phone: '077112233', idNumber: '99887766', email: 'kosal@example.com' },
          { name: 'Sreymom Pich', phone: '088445566', email: 'sreymom@example.com' },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.imported, 2);
    assert.strictEqual(data.errors.length, 0);
  });
});
