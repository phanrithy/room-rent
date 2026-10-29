/**
 * Format helpers for currency, numbers, and dates
 */

/**
 * Convert cents (integer) to formatted USD string ($1,250.00)
 * and optionally include Riel equivalent.
 * @param {number} cents
 * @param {object} [options]
 * @param {number} [options.exchangeRate=4100]
 * @param {boolean} [options.showRiel=false]
 * @param {boolean} [options.useKhmerDigits=false]
 * @returns {string}
 */
export function formatMoney(cents, options = {}) {
  const {
    exchangeRate = 4100,
    showRiel = false,
    useKhmerDigits = false,
  } = options;

  if (cents === null || cents === undefined || isNaN(cents)) {
    return '$0.00';
  }

  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;

  // Format dollars with commas
  const dollarFormatted = dollars.toLocaleString('en-US');
  const centsFormatted = remainingCents.toString().padStart(2, '0');
  let result = `${isNegative ? '-' : ''}$${dollarFormatted}.${centsFormatted}`;

  if (showRiel && exchangeRate > 0) {
    const rielAmount = Math.round((absCents / 100) * exchangeRate);
    const rielFormatted = rielAmount.toLocaleString('en-US');
    result += ` (${isNegative ? '-' : ''}${rielFormatted} ៛)`;
  }

  if (useKhmerDigits) {
    result = toKhmerDigits(result);
  }

  return result;
}

/**
 * Convert dollars string or number to integer cents
 * @param {string|number} val
 * @returns {number}
 */
export function dollarsToCents(val) {
  if (val === '' || val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert cents to decimal dollars string
 * @param {number} cents
 * @returns {string}
 */
export function centsToDollars(cents) {
  if (cents === null || cents === undefined || isNaN(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Map western digits to Khmer digits
 * @param {string|number} input
 * @returns {string}
 */
export function toKhmerDigits(input) {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(input).replace(/[0-9]/g, (w) => khmerDigits[parseInt(w, 10)]);
}

/**
 * Format YYYY-MM-DD date text
 * @param {string} dateStr
 * @param {string} [locale='en']
 * @returns {string}
 */
export function formatDate(dateStr, locale = 'en') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const intlLocale = locale === 'km' ? 'km-KH' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format YYYY-MM month string
 * @param {string} monthStr
 * @param {string} [locale='en']
 * @returns {string}
 */
export function formatMonth(monthStr, locale = 'en') {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  if (!year || !month) return monthStr;

  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const intlLocale = locale === 'km' ? 'km-KH' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
  }).format(date);
}
