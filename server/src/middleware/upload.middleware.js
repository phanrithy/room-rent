import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ValidationError } from '../utils/errors.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    cb(null, randomName);
  },
});

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only PDF, JPG, and PNG files are allowed', 'INVALID_FILE_TYPE'));
    }
  },
});
