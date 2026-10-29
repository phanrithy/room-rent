import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('i18n Locales Tests', () => {
  const enPath = path.resolve('src/i18n/locales/en.json');
  const kmPath = path.resolve('src/i18n/locales/km.json');

  test('en.json and km.json exist and are valid JSON', () => {
    assert.ok(fs.existsSync(enPath));
    assert.ok(fs.existsSync(kmPath));

    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const km = JSON.parse(fs.readFileSync(kmPath, 'utf8'));

    assert.ok(typeof en === 'object');
    assert.ok(typeof km === 'object');
  });

  test('km.json covers all top-level namespaces of en.json', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const km = JSON.parse(fs.readFileSync(kmPath, 'utf8'));

    const enKeys = Object.keys(en);
    const kmKeys = Object.keys(km);

    for (const key of enKeys) {
      assert.ok(kmKeys.includes(key), `km.json missing namespace: ${key}`);
    }
  });

  test('km.json status keys match en.json status keys', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const km = JSON.parse(fs.readFileSync(kmPath, 'utf8'));

    const enStatusKeys = Object.keys(en.status);
    const kmStatusKeys = Object.keys(km.status);

    for (const k of enStatusKeys) {
      assert.ok(kmStatusKeys.includes(k), `km.json missing status: ${k}`);
      assert.ok(km.status[k].length > 0, `km.json empty status: ${k}`);
    }
  });
});
