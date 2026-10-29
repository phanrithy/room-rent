import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Phase 4: Dashboard & Settings API', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;

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

    const resStaff = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff', password: 'Staff#2026!' }),
    });
    staffToken = (await resStaff.json()).token;
  });

  after(() => {
    server.close();
    closeDb();
  });

  test('GET /api/dashboard returns stats, today tasks, charts, and room grid for admin & staff', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.stats);
    assert.ok(data.stats.totalRooms >= 8);
    assert.ok(data.stats.occupancyRate >= 0 && data.stats.occupancyRate <= 100);
    assert.ok(data.todayTasks);
    assert.ok(Array.isArray(data.chartData));
    assert.strictEqual(data.chartData.length, 12);
    assert.ok(Array.isArray(data.roomGrid));
    assert.ok(data.roomGrid.length >= 8);

    // Staff can also access dashboard
    const staffRes = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(staffRes.status, 200);
  });

  test('GET /api/settings returns settings and property for admin', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.settings);
    assert.strictEqual(data.settings.electric_price, '150');
    assert.strictEqual(data.settings.water_price, '50');
    assert.ok(data.property);
  });

  test('Staff cannot access settings', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'PERMISSION_DENIED');
  });

  test('PATCH /api/settings updates settings and property', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        electric_price: '160',
        water_price: '55',
        property: {
          name: 'Sunrise Apartments Elite',
          address: 'St. 271, Mean Chey, Phnom Penh',
        },
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.settings.electric_price, '160');
    assert.strictEqual(data.settings.water_price, '55');

    // Revert
    await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        electric_price: '150',
        water_price: '50',
      }),
    });
  });
});
