import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Rooms API & Business Rules', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let tenantToken;

  before(async () => {
    await seedDatabase({ demo: true });
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Login admin
    const resAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin#2026!' }),
    });
    adminToken = (await resAdmin.json()).token;

    // Login staff
    const resStaff = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'Staff#2026!' }),
    });
    staffToken = (await resStaff.json()).token;

    // Login tenant
    const resTenant = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sokha', password: 'Tenant#2026!' }),
    });
    tenantToken = (await resTenant.json()).token;
  });

  after(() => {
    server.close();
    closeDb();
  });

  test('GET /api/rooms lists rooms with pagination and filters', async () => {
    const res = await fetch(`${baseUrl}/api/rooms?page=1&pageSize=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.strictEqual(data.items.length, 5);
    assert.ok(data.total >= 8);
  });

  test('GET /api/rooms filter by status works', async () => {
    const res = await fetch(`${baseUrl}/api/rooms?status=occupied`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    for (const r of data.items) {
      assert.strictEqual(r.status, 'occupied');
    }
  });

  test('POST /api/rooms creates a new room as admin', async () => {
    // Ensure clean state for test room
    const db = (await import('../src/db/connection.js')).getDb();
    db.prepare("DELETE FROM rooms WHERE room_number = '301'").run();

    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roomNumber: '301',
        floor: 3,
        monthlyRent: 22000, // $220.00
        note: 'Penthouse view',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.room.roomNumber, '301');
    assert.strictEqual(data.room.status, 'available');
  });

  test('POST /api/rooms prevents duplicate room numbers in same property', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roomNumber: '301',
        floor: 3,
        monthlyRent: 22000,
      }),
    });
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.code, 'ROOM_EXISTS');
  });

  test('POST /api/rooms rejects setting status to occupied by hand', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roomNumber: '302',
        floor: 3,
        monthlyRent: 22000,
        status: 'occupied',
      }),
    });
    // Zod validator or service rejects
    assert.ok(res.status === 400 || res.status === 422);
  });

  test('Staff can view rooms but cannot create rooms', async () => {
    const viewRes = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(viewRes.status, 200);

    const createRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        roomNumber: '303',
        floor: 3,
        monthlyRent: 20000,
      }),
    });
    assert.strictEqual(createRes.status, 403);
    const data = await createRes.json();
    assert.strictEqual(data.code, 'PERMISSION_DENIED');
  });

  test('Tenant cannot view or access rooms endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'PERMISSION_DENIED');
  });
});
