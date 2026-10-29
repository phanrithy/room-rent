import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrator.js';

describe('Health Routes', () => {
  let server;
  let baseUrl;

  before(async () => {
    runMigrations();
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

  test('GET /health returns status ok and database connected', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.database, 'connected');
    assert.ok(data.timestamp);
  });

  test('GET /api/health returns status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  test('GET /unknown-route returns 404 with standardized error object', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-path`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.code, 'ROUTE_NOT_FOUND');
    assert.ok(data.error);
  });
});
