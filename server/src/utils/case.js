/**
 * Converts a snake_case string to camelCase
 * @param {string} str
 * @returns {string}
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 * @param {string} str
 * @returns {string}
 */
export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively maps object keys from snake_case to camelCase
 * @param {any} obj
 * @returns {any}
 */
export function keysToCamel(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = keysToCamel(value);
  }
  return result;
}

/**
 * Recursively maps object keys from camelCase to snake_case
 * @param {any} obj
 * @returns {any}
 */
export function keysToSnake(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(keysToSnake);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = keysToSnake(value);
  }
  return result;
}
