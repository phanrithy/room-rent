import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-development-cambodia-room-rent-32-chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/rent.db',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  BAKONG_API_URL: process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh/v1',
  BAKONG_TOKEN: process.env.BAKONG_TOKEN || '',
  BAKONG_ACCOUNT_ID: process.env.BAKONG_ACCOUNT_ID || 'landlord@devb',
  MERCHANT_NAME: process.env.MERCHANT_NAME || 'Sunrise Apartments',
  MERCHANT_CITY: process.env.MERCHANT_CITY || 'Phnom Penh',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
};
