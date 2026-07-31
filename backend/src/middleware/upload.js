import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');

/**
 * 스토리지 팩토리 — subdir: 'images' | 'files'
 */
function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, subdir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}

/**
 * 이미지 업로드 — image/* MIME, 최대 10MB
 */
const uploadImage = multer({
  storage: makeStorage('images'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('이미지 파일만 업로드할 수 있습니다.'), { code: 'INVALID_MIME' }));
    }
  }
});

/**
 * 일반 파일 업로드 — 최대 50MB
 */
const uploadFile = multer({
  storage: makeStorage('files'),
  limits: { fileSize: 50 * 1024 * 1024 }
});

export { uploadImage, uploadFile };

