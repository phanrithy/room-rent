import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Tenants API & Privacy Rules', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let tenantToken;
  let tenantId;

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

    const resTenant = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sokha', password: 'Tenant#2026!' }),
    });
    const tenantLogin = await resTenant.json();
    tenantToken = tenantLogin.token;
    tenantId = tenantLogin.user.tenantId;
  });

  after(() => {
    server.close();
    closeDb();
  });

  test('GET /api/tenants lists tenants for admin', async () => {
    const res = await fetch(`${baseUrl}/api/tenants`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.total >= 5);
  });

  test('POST /api/tenants creates a new tenant with valid fields', async () => {
    const db = (await import('../src/db/connection.js')).getDb();
    db.prepare("DELETE FROM tenants WHERE phone = '012998877'").run();

    const res = await fetch(`${baseUrl}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Kosal Heng',
        phone: '012998877',
        idNumber: 'ID99887766',
        email: 'kosal.heng@example.com',
        telegramChatId: 'tg_kosal',
        language: 'km',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.tenant.name, 'Kosal Heng');
    assert.strictEqual(data.tenant.phone, '012998877');
  });

  test('Tenant user cannot list all tenants', async () => {
    const res = await fetch(`${baseUrl}/api/tenants`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'PERMISSION_DENIED');
  });

  test('Tenant user can view their own tenant profile', async () => {
    const res = await fetch(`${baseUrl}/api/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.tenant.id, tenantId);
  });

  test('Tenant user cannot view another tenant profile', async () => {
    const anotherTenantId = tenantId === 1 ? 2 : 1;
    const res = await fetch(`${baseUrl}/api/tenants/${anotherTenantId}`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'PERMISSION_DENIED');
  });
});
