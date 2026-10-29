import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Public QR Self-Registration & Phone Login API', () => {
  let server;
  let baseUrl;

  before(async () => {
    await seedDatabase({ demo: true });
    const db = getDb();
    db.prepare("DELETE FROM users WHERE username LIKE '099%'").run();
    db.prepare("DELETE FROM tenants WHERE phone LIKE '099%'").run();

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
    closeDb();
  });

  test('GET /api/public/rooms returns list of available rooms', async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.rooms));
    assert.ok(data.rooms.length > 0);
  });

  test('GET /api/public/rooms/:identifier returns room info by roomNumber', async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms/101`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.room.roomNumber, '101');
    assert.ok(data.room.monthlyRent > 0);
  });

  test('POST /api/public/apply registers new tenant and creates user account', async () => {
    const phone = '099887766';
    const applyPayload = {
      name: 'Chamroeun Heng',
      phone,
      idNumber: 'ID0998877',
      roomId: '101',
      email: 'chamroeun@example.com',
    };

    const res = await fetch(`${baseUrl}/api/public/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applyPayload),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.tenant.name, 'Chamroeun Heng');
    assert.strictEqual(data.credentials.username, phone);
    assert.ok(data.credentials.tempPassword.startsWith('Rent#'));

    // Verify tenant can immediately log in using their phone number and generated default password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: phone,
        password: data.credentials.tempPassword,
      }),
    });

    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.user.role, 'tenant');
    assert.ok(loginData.token);
  });
});