import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Auth & Role Check API', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;

  before(async () => {
    await seedDatabase({ demo: true });
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

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin#2026!' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'admin');
    assert.strictEqual(data.user.role, 'admin');
    assert.strictEqual(data.user.passwordHash, undefined); // Never leak hash
    adminToken = data.token;
  });

  test('POST /api/auth/login fails with invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword!' }),
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.code, 'INVALID_CREDENTIALS');
    assert.ok(data.error);
  });

  test('GET /api/auth/me returns authenticated user details', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.username, 'admin');
    assert.strictEqual(data.user.role, 'admin');
  });

  test('PATCH /api/auth/preferences updates language and theme', async () => {
    const res = await fetch(`${baseUrl}/api/auth/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ language: 'km', theme: 'dark' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.language, 'km');
    assert.strictEqual(data.user.theme, 'dark');

    // Restore to en/system
    await fetch(`${baseUrl}/api/auth/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ language: 'en', theme: 'system' }),
    });
  });

  test('POST /api/auth/change-password changes user password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin#2026!',
        newPassword: 'NewAdmin#2026!',
      }),
    });

    assert.strictEqual(res.status, 200);

    // Verify login with new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'NewAdmin#2026!' }),
    });
    assert.strictEqual(loginRes.status, 200);

    // Change back
    const revertToken = (await loginRes.json()).token;
    await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revertToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'NewAdmin#2026!',
        newPassword: 'Admin#2026!',
      }),
    });
  });

  test('GET /api/auth/me rejects missing or invalid token', async () => {
    const resNoToken = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(resNoToken.status, 401);

    const resInvalid = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer totally-fake-token' },
    });
    assert.strictEqual(resInvalid.status, 401);
    const data = await resInvalid.json();
    assert.strictEqual(data.code, 'INVALID_TOKEN');
  });
});
