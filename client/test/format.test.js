import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatMoney,
  dollarsToCents,
  centsToDollars,
  toKhmerDigits,
  formatDate,
  formatMonth,
} from '../src/utils/format.js';

describe('Format Utility Tests', () => {
  test('dollarsToCents converts dollar inputs to integer cents without floating point issues', () => {
    assert.strictEqual(dollarsToCents('150.00'), 15000);
    assert.strictEqual(dollarsToCents('150.50'), 15050);
    assert.strictEqual(dollarsToCents('0.99'), 99);
    assert.strictEqual(dollarsToCents(12.34), 1234);
    assert.strictEqual(dollarsToCents(''), 0);
    assert.strictEqual(dollarsToCents(null), 0);
  });

  test('centsToDollars formats cents to 2 decimal places', () => {
    assert.strictEqual(centsToDollars(15000), '150.00');
    assert.strictEqual(centsToDollars(99), '0.99');
    assert.strictEqual(centsToDollars(0), '0.00');
  });

  test('formatMoney formats cents to USD and optional KHR', () => {
    assert.strictEqual(formatMoney(125000), '$1,250.00');
    assert.strictEqual(formatMoney(0), '$0.00');
    assert.strictEqual(
      formatMoney(10000, { showRiel: true, exchangeRate: 4100 }),
      '$100.00 (410,000 ៛)'
    );
  });

  test('toKhmerDigits converts 0-9 to Khmer numerals', () => {
    assert.strictEqual(toKhmerDigits('12345'), '១២៣៤៥');
    assert.strictEqual(toKhmerDigits('Room 101: $150'), 'Room ១០១: $១៥០');
  });

  test('formatDate formats YYYY-MM-DD correctly', () => {
    const formatted = formatDate('2026-10-29', 'en');
    assert.ok(formatted.includes('2026'));
  });

  test('formatMonth formats YYYY-MM correctly', () => {
    const formatted = formatMonth('2026-08', 'en');
    assert.ok(formatted.includes('August') && formatted.includes('2026'));
  });
});
