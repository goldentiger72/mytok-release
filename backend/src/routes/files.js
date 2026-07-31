import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, uploadFile } from '../middleware/upload.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');

/**
 * POST /api/rooms/:id/upload — 파일 업로드
 * 이미지: image/* MIME → images/ 폴더, 10MB
 * 그 외: files/ 폴더, 50MB
 */
router.post('/:id/upload', requireAuth, (req, res, next) => {
  const roomId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  // 구성원 확인
  const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!member) return res.status(403).json({ error: 'NOT_MEMBER' });

  // Content-Type 기반으로 업로더 선택
  const contentType = req.headers['content-type'] || '';
  const isImage = contentType.includes('image/') ||
    (req.headers['x-file-type'] || '').startsWith('image/');

  // multer 동적 선택
  const uploader = isImage
    ? uploadImage.single('file')
    : uploadFile.single('file');

  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'FILE_TOO_LARGE', message: '파일 크기가 제한을 초과했습니다.' });
      }
      if (err.code === 'INVALID_MIME') {
        return res.status(415).json({ error: 'INVALID_MIME', message: err.message });
      }
      return next(err);
    }

    if (!req.file) return res.status(400).json({ error: 'NO_FILE', message: '파일이 없습니다.' });

    const subdir = req.file.destination.includes('images') ? 'images' : 'files';
    const storedName = req.file.filename;
    const storagePath = `${subdir}/${storedName}`;

    // 메시지 + 첨부 DB 저장 (트랜잭션)
    const saveAttachment = db.transaction(() => {
      const { lastInsertRowid: msgId } = db.prepare(
        'INSERT INTO messages (room_id, sender_id, content, has_attachment) VALUES (?, ?, ?, 1)'
      ).run(roomId, userId, req.file.originalname);

      db.prepare(`
        INSERT INTO attachments (message_id, original_name, stored_name, mime_type, size_bytes, storage_path)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(msgId, req.file.originalname, storedName, req.file.mimetype, req.file.size, storagePath);

      return db.prepare(`
        SELECT m.*, a.original_name, a.stored_name, a.mime_type, a.size_bytes
        FROM messages m JOIN attachments a ON a.message_id = m.id WHERE m.id = ?
      `).get(msgId);
    });

    const record = saveAttachment();
    const sender = db.prepare('SELECT display_name, avatar_url FROM users WHERE id = ?').get(userId);

    const message = {
      id: record.id,
      roomId,
      senderId: userId,
      senderName: sender.display_name,
      senderAvatar: sender.avatar_url,
      content: record.original_name,
      sentAt: record.sent_at,
      attachment: {
        originalName: record.original_name,
        mimeType: record.mime_type,
        sizeBytes: record.size_bytes,
        url: `/api/files/${record.stored_name}`
      }
    };

    // Socket 브로드캐스트
    const io = req.app.get('io');
    io.to(`room:${roomId}`).emit('new_message', { message });

    res.status(201).json({ message });
  });
});

/**
 * GET /api/files/:storedName — 파일 스트리밍
 * 인증: 세션(requireAuth) 또는 Authorization: Bearer <token> 헤더
 */
router.get('/:storedName', (req, res) => {
  // URL Query 토큰 보안상 거부
  if (req.query.token) {
    return res.status(401).json({ error: 'QUERY_TOKEN_DISALLOWED', message: 'URL Query 토큰은 허용되지 않습니다. Bearer 헤더를 사용하세요.' });
  }

  // Authorization: Bearer 헤더 검증
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const bot = db.prepare('SELECT id FROM bots WHERE token_hash = ? AND is_active = 1').get(tokenHash);
    if (!bot) return res.status(401).json({ error: 'INVALID_TOKEN' });
  } else if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' });
  }
  const storedName = path.basename(req.params.storedName);

  for (const sub of ['images', 'files']) {
    const filePath = path.join(UPLOADS_DIR, sub, storedName);
    if (fs.existsSync(filePath)) {
      // DB에서 원본 파일명과 MIME 타입 조회
      const att = db.prepare('SELECT original_name, mime_type FROM attachments WHERE stored_name = ?').get(storedName);
      const mimeType = att?.mime_type || 'application/octet-stream';
      const originalName = att?.original_name || storedName;

      res.setHeader('Content-Type', mimeType);

      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        // 이미지·PDF는 브라우저에서 바로 표시
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
      } else {
        // 그 외는 강제 다운로드
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
      }

      return res.sendFile(filePath);
    }
  }

  res.status(404).json({ error: 'FILE_NOT_FOUND' });
});

export default router;
