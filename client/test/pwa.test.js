import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('PWA & Shell Asset Tests', () => {
  const manifestPath = path.resolve('public/manifest.json');
  const swPath = path.resolve('public/sw.js');
  const iconPath = path.resolve('public/icon.svg');

  test('manifest.json exists and contains required PWA fields', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.ok(manifest.name, 'manifest must have a name');
    assert.ok(manifest.short_name, 'manifest must have a short_name');
    assert.strictEqual(manifest.display, 'standalone');
    assert.ok(manifest.start_url);
    assert.ok(manifest.theme_color);
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  });

  test('sw.js exists and defines shell caching', () => {
    assert.ok(fs.existsSync(swPath), 'sw.js must exist');
    const content = fs.readFileSync(swPath, 'utf8');
    assert.ok(content.includes('CACHE_NAME'), 'sw.js must define CACHE_NAME');
    assert.ok(content.includes('addEventListener(\'fetch\''), 'sw.js must handle fetch events');
    assert.ok(content.includes('addEventListener(\'install\''), 'sw.js must handle install events');
  });

  test('icon.svg exists and is valid SVG', () => {
    assert.ok(fs.existsSync(iconPath), 'icon.svg must exist');
    const content = fs.readFileSync(iconPath, 'utf8');
    assert.ok(content.startsWith('<svg') || content.includes('<svg'), 'icon.svg must be an svg');
  });
});