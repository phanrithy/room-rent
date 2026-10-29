import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/app.js';
import { closeDb, getDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Phase 7: Safety & Growth (Staff, Audit, Uploads, Multi-Property, Backup)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;
  let testContractId;
  let createdUserId;
  let createdDocId;

  before(async () => {
    const db = getDb();
    // Clean specific test records if leftover
    db.prepare("DELETE FROM users WHERE username = 'teststaff'").run();
    db.prepare("DELETE FROM properties WHERE name = 'Annex Tower'").run();

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

    // Get an active contract id
    const contract = db.prepare("SELECT id FROM contracts WHERE status = 'active' LIMIT 1").get();
    testContractId = contract.id;
  });

  after(() => {
    server.close();
    closeDb();
  });

  // 1. Staff & User Management
  test('Admin can list users; Staff cannot', async () => {
    const resAdmin = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdmin.status, 200);
    const data = await resAdmin.json();
    assert.ok(Array.isArray(data.items));

    const resStaff = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(resStaff.status, 403);
  });

  test('POST /api/users creates a new staff user with hashed password', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'teststaff',
        password: 'Password#123',
        role: 'staff',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.user.username, 'teststaff');
    assert.strictEqual(data.user.role, 'staff');
    assert.strictEqual(data.user.passwordHash, undefined, 'Password hash must never be exposed');
    createdUserId = data.user.id;
  });

  test('PATCH /api/users/:id updates active status and DELETE /api/users/:id deletes user', async () => {
    // Deactivate
    const resPatch = await fetch(`${baseUrl}/api/users/${createdUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: 0 }),
    });
    assert.strictEqual(resPatch.status, 200);

    // Delete
    const resDel = await fetch(`${baseUrl}/api/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDel.status, 200);
  });

  // 2. Audit Trail
  test('GET /api/audit-logs returns log entries and filters by tableName', async () => {
    const res = await fetch(`${baseUrl}/api/audit-logs?tableName=users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
    assert.strictEqual(data.items[0].tableName, 'users');
  });

  // 3. Multi-Property
  test('POST /api/properties creates a property and GET /api/properties lists it', async () => {
    const resCreate = await fetch(`${baseUrl}/api/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Annex Tower',
        address: 'St 333, Phnom Penh',
      }),
    });
    assert.strictEqual(resCreate.status, 201);
    const propId = (await resCreate.json()).property.id;

    const resList = await fetch(`${baseUrl}/api/properties`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resList.status, 200);
    const list = await resList.json();
    assert.ok(list.items.some((p) => p.id === propId));

    // Delete
    const resDel = await fetch(`${baseUrl}/api/properties/${propId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDel.status, 200);
  });

  // 4. File Upload & Stream
  test('POST /api/documents/contract/:id uploads PDF and GET streams file', async () => {
    const boundary = '----WebKitFormBoundaryTest123';
    const fakePdfContent = '%PDF-1.4 sample pdf content for testing';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="kind"',
      '',
      'contract',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="lease_agreement.pdf"',
      'Content-Type: application/pdf',
      '',
      fakePdfContent,
      `--${boundary}--`,
    ].join('\r\n');

    const resUpload = await fetch(`${baseUrl}/api/documents/contract/${testContractId}`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    assert.strictEqual(resUpload.status, 201);
    const uploadData = await resUpload.json();
    assert.ok(uploadData.document);
    assert.strictEqual(uploadData.document.originalName, 'lease_agreement.pdf');
    createdDocId = uploadData.document.id;

    // Stream file
    const resStream = await fetch(`${baseUrl}/api/documents/${createdDocId}/file`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resStream.status, 200);
    assert.strictEqual(resStream.headers.get('content-type'), 'application/pdf');

    // Delete document
    const resDel = await fetch(`${baseUrl}/api/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDel.status, 200);
  });

  // 5. Database Backup
  test('GET /api/settings/backup returns an SQLite database stream', async () => {
    const res = await fetch(`${baseUrl}/api/settings/backup`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);

    const header = new Uint8Array(buffer.slice(0, 15));
    const headerStr = String.fromCharCode(...header);
    assert.strictEqual(headerStr, 'SQLite format 3');
  });
});
