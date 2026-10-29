import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { getDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('End-to-End Room Application & Tenant Contract Flow', () => {
  let server;
  let baseUrl;
  let adminToken;

  before(async () => {
    await seedDatabase({ demo: true });

    const app = createApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const db = getDb();

    // Ensure room 203 is available for test contract
    const r203 = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get('203');
    if (r203) {
      db.prepare('DELETE FROM invoices WHERE contract_id IN (SELECT id FROM contracts WHERE room_id = ?)').run(r203.id);
      db.prepare('DELETE FROM documents WHERE contract_id IN (SELECT id FROM contracts WHERE room_id = ?)').run(r203.id);
      db.prepare('DELETE FROM contracts WHERE room_id = ?').run(r203.id);
      db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(r203.id);
    }

    const existing = db.prepare('SELECT id FROM tenants WHERE phone = ?').get('0977112233');
    if (existing) {
      db.prepare('DELETE FROM documents WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM maintenance_requests WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM contracts WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM room_applications WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM users WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM tenants WHERE id = ?').run(existing.id);
    }

    // Login as admin
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin#2026!',
      }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData.token;
  });

  after(async () => {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tenants WHERE phone = ?').get('0977112233');
    if (existing) {
      db.prepare('DELETE FROM documents WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM maintenance_requests WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM contracts WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM room_applications WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM users WHERE tenant_id = ?').run(existing.id);
      db.prepare('DELETE FROM tenants WHERE id = ?').run(existing.id);
    }
    const r203 = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get('203');
    if (r203) {
      db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(r203.id);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('Step 1: Prospective tenant applies for Room 203 via QR public route', async () => {
    const res = await fetch(`${baseUrl}/api/public/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dara Pich',
        phone: '0977112233',
        idNumber: 'KHM12345678',
        roomId: '203',
        telegramChatId: '@darapich',
        moveInDate: '2026-11-01',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.tenant.name, 'Dara Pich');
    assert.equal(data.room.roomNumber, '203');
    assert.equal(data.application.status, 'pending');
    assert.equal(data.credentials.username, '0977112233');
    assert.equal(data.credentials.tempPassword, 'Rent#203');
  });

  test('Step 2: Tenant logs in immediately and sees applied room info & pending status', async () => {
    // Login with phone and default password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '0977112233',
        password: 'Rent#203',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    const tenantToken = loginData.token;

    // View tenant dashboard
    const dashRes = await fetch(`${baseUrl}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();

    assert.equal(dashData.activeContract, null);
    assert.ok(dashData.pendingApplication);
    assert.equal(dashData.pendingApplication.roomNumber, '203');
    assert.equal(dashData.pendingApplication.status, 'pending');
    assert.equal(dashData.pendingApplication.moveInDate, '2026-11-01');

    // Tenant updates contact information before landlord finishes contract
    const updateRes = await fetch(`${baseUrl}/api/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        name: 'Dara Pich Updated',
        idNumber: 'KHM99999999',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.tenant.name, 'Dara Pich Updated');
    assert.equal(updateData.tenant.idNumber, 'KHM99999999');
  });

  test('Step 3: Admin reviews pending applications in dashboard & contracts page', async () => {
    const res = await fetch(`${baseUrl}/api/applications/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.total >= 1);
    const app = data.items.find((a) => a.tenantPhone === '0977112233');
    assert.ok(app);
    assert.equal(app.roomNumber, '203');
    assert.equal(app.tenantName, 'Dara Pich Updated');
  });

  test('Step 4: Admin agrees & creates contract for applicant; account receives credentials', async () => {
    // Get tenant and room IDs
    const db = getDb();
    const tenant = db.prepare('SELECT id FROM tenants WHERE phone = ?').get('0977112233');
    const room = db.prepare('SELECT id, monthly_rent FROM rooms WHERE room_number = ?').get('203');

    const createRes = await fetch(`${baseUrl}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roomId: room.id,
        tenantId: tenant.id,
        startDate: '2026-11-01',
        endDate: '2027-10-31',
        deposit: room.monthly_rent,
        rentAmount: room.monthly_rent,
      }),
    });

    assert.equal(createRes.status, 201);
    const data = await createRes.json();
    const contract = data.contract;
    assert.equal(contract.status, 'active');
    assert.ok(contract.tenantAccount);
    assert.equal(contract.tenantAccount.username, '0977112233');
    assert.ok(contract.tenantAccount.shareText);

    // Verify application status changed to approved
    const appRow = db.prepare('SELECT status FROM room_applications WHERE tenant_id = ?').get(tenant.id);
    assert.equal(appRow.status, 'approved');

    // Verify room is now occupied
    const roomRow = db.prepare('SELECT status FROM rooms WHERE id = ?').get(room.id);
    assert.equal(roomRow.status, 'occupied');
  });

  test('Step 5: Tenant logs in after approval and sees active lease details', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '0977112233',
        password: 'Rent#203',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();

    const dashRes = await fetch(`${baseUrl}/api/me/dashboard`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();

    assert.ok(dashData.activeContract);
    assert.equal(dashData.activeContract.roomNumber, '203');
    assert.equal(dashData.activeContract.startDate, '2026-11-01');
  });
});
