import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { closeDb } from '../src/db/connection.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Phase 5: PDF & Excel Export API', () => {
  let server;
  let baseUrl;
  let adminToken;
  let testInvoiceId;
  let testPaymentId;

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

    // Fetch an invoice to get an ID
    const invRes = await fetch(`${baseUrl}/api/invoices?pageSize=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const invData = await invRes.json();
    testInvoiceId = invData.items[0]?.id;

    // Fetch a payment to get an ID
    const payRes = await fetch(`${baseUrl}/api/payments?pageSize=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const payData = await payRes.json();
    testPaymentId = payData.items[0]?.id;
  });

  after(() => {
    server.close();
    closeDb();
  });

  test('GET /api/invoices/:id/pdf streams a valid PDF with KHQR', async () => {
    const res = await fetch(`${baseUrl}/api/invoices/${testInvoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
    // PDF magic bytes %PDF-
    const header = new Uint8Array(buffer.slice(0, 5));
    const headerStr = String.fromCharCode(...header);
    assert.strictEqual(headerStr, '%PDF-');
  });

  test('GET /api/payments/:id/pdf streams an official receipt PDF', async () => {
    const res = await fetch(`${baseUrl}/api/payments/${testPaymentId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
    const header = new Uint8Array(buffer.slice(0, 5));
    const headerStr = String.fromCharCode(...header);
    assert.strictEqual(headerStr, '%PDF-');
  });

  test('GET /api/reports/export/invoices streams a valid Excel workbook', async () => {
    const res = await fetch(`${baseUrl}/api/reports/export/invoices`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
    // Zip/xlsx magic bytes PK..
    const header = new Uint8Array(buffer.slice(0, 2));
    assert.strictEqual(header[0], 0x50); // 'P'
    assert.strictEqual(header[1], 0x4b); // 'K'
  });

  test('GET /api/reports/export/payments streams a valid Excel workbook', async () => {
    const res = await fetch(`${baseUrl}/api/reports/export/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
    const header = new Uint8Array(buffer.slice(0, 2));
    assert.strictEqual(header[0], 0x50);
    assert.strictEqual(header[1], 0x4b);
  });
});
