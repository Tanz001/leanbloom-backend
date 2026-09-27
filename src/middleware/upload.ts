import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { AppError } from './errorHandler';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const productsDir = path.join(process.cwd(), 'uploads', 'products');
const logosDir = path.join(process.cwd(), 'uploads', 'logos');
ensureDir(productsDir);
ensureDir(logosDir);

function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', 400));
    return;
  }
  cb(null, true);
}

function makeStorage(dir: string, prefix: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(
        ext
      )
        ? ext
        : '.jpg';
      cb(
        null,
        `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`
      );
    },
  });
}

export const productImageUpload = multer({
  storage: makeStorage(productsDir, 'product'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const affiliateLogoUpload = multer({
  storage: makeStorage(logosDir, 'logo'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
