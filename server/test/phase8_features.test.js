import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb, getDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Phase 8: Tenant Portal, Maintenance, Reminders, and Bakong KHQR Level 2', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let tenantToken;
  let testRoomId;
  let createdMaintenanceId;

  before(async () => {
    const db = getDb();
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

    const resStaff = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'Staff#2026!' }),
    });
    staffToken = (await resStaff.json()).token;

    // Ensure sokha has an active contract for tenant portal tests
    const sokhaTenant = db.prepare("SELECT tenant_id FROM users WHERE username = 'sokha'").get();
    if (sokhaTenant) {
      const existingActive = db.prepare("SELECT id FROM contracts WHERE tenant_id = ? AND status = 'active'").get(sokhaTenant.tenant_id);
      if (!existingActive) {
        const freeRoom = db.prepare("SELECT id FROM rooms WHERE status = 'available'").get();
        if (freeRoom) {
          db.prepare("INSERT INTO contracts (room_id, tenant_id, start_date, end_date, deposit, rent_amount, status) VALUES (?, ?, '2026-08-01', '2027-08-01', 15000, 15000, 'active')").run(freeRoom.id, sokhaTenant.tenant_id);
          db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(freeRoom.id);
        }
      }
    }

    const resTenant = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sokha', password: 'Tenant#2026!' }),
    });
    tenantToken = (await resTenant.json()).token;

    const room = db.prepare('SELECT id FROM rooms LIMIT 1').get();
    testRoomId = room.id;
  });

  after(() => {
    server.close();
    closeDb();
  });

  // 1. Maintenance Requests
  test('POST /api/maintenance creates request and GET lists requests', async () => {
    const resCreate = await fetch(`${baseUrl}/api/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roomId: testRoomId,
        description: 'Leaking bathroom pipe',
        cost: 2500,
      }),
    });

    assert.strictEqual(resCreate.status, 201);
    const data = await resCreate.json();
    assert.ok(data.request);
    assert.strictEqual(data.request.description, 'Leaking bathroom pipe');
    assert.strictEqual(data.request.status, 'open');
    createdMaintenanceId = data.request.id;

    // List
    const resList = await fetch(`${baseUrl}/api/maintenance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resList.status, 200);
    const list = await resList.json();
    assert.ok(list.items.some((m) => m.id === createdMaintenanceId));
  });

  test('PATCH /api/maintenance/:id marks done and creates building expense', async () => {
    const resPatch = await fetch(`${baseUrl}/api/maintenance/${createdMaintenanceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'done',
        cost: 2500,
        createExpense: true,
      }),
    });

    assert.strictEqual(resPatch.status, 200);
    const patchData = await resPatch.json();
    assert.strictEqual(patchData.request.status, 'done');

    // Verify an expense row was created with repair category
    const db = getDb();
    const expense = db
      .prepare(`
        SELECT * FROM expenses 
        WHERE note LIKE ? 
        ORDER BY id DESC LIMIT 1
      `)
      .get(`%Maintenance #${createdMaintenanceId}%`);

    assert.ok(expense, 'Finished maintenance with cost must create an expense');
    assert.strictEqual(expense.category, 'repair');
    assert.strictEqual(expense.amount, 2500);
  });

  // 2. Tenant Portal (/api/me)
  test('Tenant can access /api/me/dashboard and view active contract & invoices', async () => {
    const res = await fetch(`${baseUrl}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.tenant);
    assert.ok(data.activeContract);
    assert.ok(Array.isArray(data.recentInvoices));

    // Admin cannot access tenant-only route
    const resAdmin = await fetch(`${baseUrl}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdmin.status, 403);
  });

  test('Tenant can submit a maintenance request for their active room', async () => {
    const res = await fetch(`${baseUrl}/api/me/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        description: 'Light bulb flickering in bedroom',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.request);
    assert.strictEqual(data.request.description, 'Light bulb flickering in bedroom');
    assert.ok(data.request.tenantId);
  });

  // 3. Bakong Auto-Check & Reminders
  test('POST /api/khqr/check executes Bakong auto-reconciliation quietly', async () => {
    const res = await fetch(`${baseUrl}/api/khqr/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.checked === 'number');
    assert.ok(typeof data.paidCount === 'number');
  });

  test('POST /api/khqr/reminders executes reminder cycle and logs notifications', async () => {
    const res = await fetch(`${baseUrl}/api/khqr/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ date: '2099-12-02' }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.totalSent === 'number');
  });
});
