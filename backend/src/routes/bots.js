import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

const router = express.Router();

// ── Rate Limit (인메모리, 토큰별 60 req/min) ──────────────────────────────
const rateLimitMap = new Map(); // Map<tokenHash, { count, resetAt }>
const RATE_LIMIT = 60;    // FR-005: 분당 60회 요청 제한
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(tokenHash) {
  const now = Date.now();
  let entry = rateLimitMap.get(tokenHash);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitMap.set(tokenHash, entry);
  }
  entry.count += 1;
  return entry;
}

// ── 봇 토큰 검증 미들웨어 ──────────────────────────────────────────────────
function validateBotToken(req, res, next) {
  const rawToken = req.params.token;
  if (!rawToken) return res.status(401).json({ error: 'INVALID_TOKEN' });

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const bot = db.prepare('SELECT * FROM bots WHERE token_hash = ? AND is_active = 1').get(tokenHash);
  if (!bot) return res.status(401).json({ error: 'INVALID_TOKEN', message: '유효하지 않은 봇 토큰입니다.' });

  // Rate Limit 체크
  const rl = checkRateLimit(tokenHash);
  const remaining = Math.max(0, RATE_LIMIT - rl.count);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rl.resetAt / 1000));

  if (rl.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: '요청 한도 초과. 잠시 후 다시 시도하세요.',
      resetAt: new Date(rl.resetAt).toISOString()
    });
  }

  req.bot = bot;
  next();
}

// ════════════════════════════════════════════════════════════════════════════
// 봇 관리 API (소유자 전용)
// ════════════════════════════════════════════════════════════════════════════

// POST /api/bots — 봇 생성 및 토큰 발급
router.post('/', requireAuth, requireOwner, (req, res) => {
  const { name, roomId, aiType } = req.body;

  if (!name || !roomId || !aiType) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'name, roomId, aiType은 필수입니다.' });
  }
  const validTypes = ['hermes', 'claude', 'claude-code', 'openclaw'];
  if (!validTypes.includes(aiType)) {
    return res.status(400).json({ error: 'INVALID_AI_TYPE', message: 'aiType은 hermes, claude, claude-code, openclaw 중 하나여야 합니다.' });
  }

  const room = db.prepare('SELECT id, name FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  // 동일 이름+방+타입의 활성 봇이 이미 존재하면 중복 생성 방지
  const existing = db.prepare(
    'SELECT id FROM bots WHERE name = ? AND room_id = ? AND ai_type = ? AND is_active = 1'
  ).get(name, roomId, aiType);
  if (existing) {
    return res.status(409).json({ error: 'BOT_ALREADY_EXISTS', message: `이미 동일한 봇("${name}")이 이 방에 활성 상태로 존재합니다.` });
  }

  // 토큰 생성 (원본은 1회만 노출)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 봇 전용 사용자 생성
  const botEmail = `bot-tmp@mytok.local`; // 임시, ID 확정 후 업데이트
  const userResult = db.prepare(
    'INSERT INTO users (google_id, email, display_name, is_bot) VALUES (NULL, ?, ?, 1) RETURNING id'
  ).get(`bot-new-${Date.now()}@mytok.local`, name);
  const botUserId = userResult.id;

  // 봇 레코드 생성
  const botResult = db.prepare(
    'INSERT INTO bots (name, room_id, token_hash, ai_type) VALUES (?, ?, ?, ?) RETURNING id'
  ).get(name, roomId, tokenHash, aiType);
  const botId = botResult.id;

  // 봇 사용자 이메일 확정 (botId 포함)
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(`bot-${botId}@mytok.local`, botUserId);

  // 봇을 채팅방 구성원에 추가
  db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, botUserId);

  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId);
  res.status(201).json({
    id: bot.id,
    name: bot.name,
    roomId: bot.room_id,
    aiType: bot.ai_type,
    token: rawToken,   // ⚠️ 이 응답에서만 노출
    isActive: !!bot.is_active,
    createdAt: bot.created_at
  });
});

// GET /api/bots — 봇 목록
router.get('/', requireAuth, requireOwner, (req, res) => {
  const bots = db.prepare(`
    SELECT b.id, b.name, b.room_id, r.name AS room_name, b.ai_type, b.is_active, b.created_at
    FROM bots b JOIN rooms r ON r.id = b.room_id
    ORDER BY b.created_at DESC
  `).all();

  res.json(bots.map(b => ({
    id: b.id,
    name: b.name,
    roomId: b.room_id,
    roomName: b.room_name,
    aiType: b.ai_type,
    isActive: !!b.is_active,
    createdAt: b.created_at
  })));
});

// PATCH /api/bots/:id — 봇 이름 변경
router.patch('/:id', requireAuth, requireOwner, (req, res) => {
  const botId = parseInt(req.params.id, 10);
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'name은 필수입니다.' });
  }

  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(botId);
  if (!bot) return res.status(404).json({ error: 'BOT_NOT_FOUND' });

  const newName = name.trim();
  db.prepare('UPDATE bots SET name = ? WHERE id = ?').run(newName, botId);
  // 봇 사용자 display_name도 동기화
  db.prepare('UPDATE users SET display_name = ? WHERE email = ? AND is_bot = 1')
    .run(newName, `bot-${botId}@mytok.local`);

  res.json({ id: botId, name: newName, message: '봇 이름이 변경되었습니다.' });
});

// DELETE /api/bots/:id — 토큰 폐기 (is_active = 0)
router.delete('/:id', requireAuth, requireOwner, (req, res) => {
  const botId = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(botId);
  if (!bot) return res.status(404).json({ error: 'BOT_NOT_FOUND' });

  db.prepare('UPDATE bots SET is_active = 0 WHERE id = ?').run(botId);
  res.json({ message: '봇 토큰이 폐기되었습니다.' });
});

// DELETE /api/bots/:id/permanent — 봇 완전 삭제 (DB 레코드 제거)
router.delete('/:id/permanent', requireAuth, requireOwner, (req, res) => {
  const botId = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id, name FROM bots WHERE id = ?').get(botId);
  if (!bot) return res.status(404).json({ error: 'BOT_NOT_FOUND' });

  const botEmail = `bot-${botId}@mytok.local`;
  const botUser = db.prepare('SELECT id FROM users WHERE email = ? AND is_bot = 1').get(botEmail);

  // 트랜잭션으로 관련 데이터 일괄 삭제
  const deleteTx = db.transaction(() => {
    if (botUser) {
      db.prepare('DELETE FROM messages WHERE sender_id = ?').run(botUser.id);
      db.prepare('DELETE FROM room_members WHERE user_id = ?').run(botUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(botUser.id);
    }
    db.prepare('DELETE FROM bots WHERE id = ?').run(botId);
  });
  deleteTx();

  res.json({ message: `봇 "${bot.name}"이(가) 완전히 삭제되었습니다.` });
});

// POST /api/bots/:id/regenerate — 토큰 재발급
router.post('/:id/regenerate', requireAuth, requireOwner, (req, res) => {
  const botId = parseInt(req.params.id, 10);
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(botId);
  if (!bot) return res.status(404).json({ error: 'BOT_NOT_FOUND' });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  db.prepare('UPDATE bots SET token_hash = ?, is_active = 1 WHERE id = ?').run(tokenHash, botId);

  res.json({
    id: botId,
    token: rawToken,
    message: '새 토큰이 발급되었습니다. 이전 토큰은 즉시 폐기됩니다.'
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bot API (/bot/:token/... — Bridge 스크립트용)
// ════════════════════════════════════════════════════════════════════════════

// GET /bot/:token/getUpdates — 새 메시지 폴링
router.get('/:token/getUpdates', validateBotToken, (req, res) => {
  const bot = req.bot;
  const offset = parseInt(req.query.offset, 10) || 0;

  // 봇 채팅방의 사람이 보낸 신규 메시지 (봇 메시지 제외)
  const rawMessages = db.prepare(`
    SELECT m.id, m.sender_id, m.content, m.sent_at,
           u.display_name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.room_id = ? AND m.id > ? AND u.is_bot = 0
    ORDER BY m.id ASC
    LIMIT 20
  `).all(bot.room_id, offset);

  const updates = rawMessages.map(msg => {
    // 직전 10개 메시지를 AI용 context로 변환
    const history = db.prepare(`
      SELECT m.content, u.is_bot
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ? AND m.id < ?
      ORDER BY m.id DESC LIMIT 10
    `).all(bot.room_id, msg.id).reverse();

    const context = history.map(h => ({
      role: h.is_bot ? 'assistant' : 'user',
      content: h.content
    }));
    // 현재 메시지 추가
    context.push({ role: 'user', content: msg.content });

    return {
      messageId: msg.id,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      content: msg.content,
      sentAt: msg.sent_at,
      context
    };
  });

  const nextOffset = updates.length > 0 ? updates[updates.length - 1].messageId : offset;
  res.json({ ok: true, updates, nextOffset });
});

// POST /bot/:token/sendMessage — 봇 메시지 전송
router.post('/:token/sendMessage', validateBotToken, (req, res) => {
  const bot = req.bot;
  const { content, parentMessageId = null } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'CONTENT_REQUIRED' });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: 'CONTENT_TOO_LONG', message: '메시지는 4000자 이하여야 합니다.' });
  }

  // 봇 사용자 ID 조회
  const botUser = db.prepare(`SELECT id FROM users WHERE email = ? AND is_bot = 1`).get(`bot-${bot.id}@mytok.local`);
  if (!botUser) return res.status(500).json({ error: 'BOT_USER_NOT_FOUND' });

  const senderInfo = db.prepare('SELECT display_name, avatar_url FROM users WHERE id = ?').get(botUser.id);
  const io = req.app.get('io');

  // 스레드 답글 처리 (parentMessageId가 존재할 경우)
  if (parentMessageId) {
    try {
      const pMsgId = parseInt(parentMessageId, 10);
      let thread = db.prepare('SELECT id FROM threads WHERE parent_message_id = ?').get(pMsgId);
      if (!thread) {
        // 부모 메시지로부터 스레드 자동 개설
        const threadId = 'th_' + uuidv4();
        db.prepare(`
          INSERT INTO threads (id, room_id, parent_message_id, title, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(threadId, bot.room_id, pMsgId, 'Auto Thread', botUser.id);
        thread = { id: threadId };
      }

      const replyId = 'rep_' + uuidv4();
      db.prepare(`
        INSERT INTO thread_messages (id, thread_id, user_id, content, is_bot)
        VALUES (?, ?, ?, ?, 1)
      `).run(replyId, thread.id, botUser.id, content.trim());

      const reply = {
        id: replyId,
        threadId: thread.id,
        userId: botUser.id,
        senderName: senderInfo?.display_name || bot.name,
        senderAvatar: senderInfo?.avatar_url,
        content: content.trim(),
        isBot: 1,
        createdAt: new Date().toISOString()
      };

      if (io) {
        io.to(`room:${bot.room_id}`).emit('new_thread_reply', {
          roomId: bot.room_id,
          messageId: pMsgId,
          reply
        });
      }

      return res.status(201).json({ ok: true, replyId, sentAt: reply.createdAt });
    } catch (err) {
      return res.status(500).json({ error: 'DB_ERROR', message: err.message });
    }
  }

  // 일반 메시지 저장
  const result = db.prepare(
    'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?)'
  ).run(bot.room_id, botUser.id, content.trim());

  const newMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  // Socket.io 브로드캐스트
  if (io) {
    io.to(`room:${bot.room_id}`).emit('new_message', {
      message: {
        id: newMsg.id,
        roomId: bot.room_id,
        senderId: botUser.id,
        senderName: senderInfo?.display_name || bot.name,
        senderAvatar: senderInfo?.avatar_url,
        content: newMsg.content,
        sentAt: newMsg.sent_at,
        readStatus: null,
        attachment: null,
        isBot: true
      }
    });
  }

  res.status(201).json({ ok: true, messageId: newMsg.id, sentAt: newMsg.sent_at });
});

// POST /bot/:token/typing — 봇 "응답 작성 중" 표시 on/off
// 브리지/채널이 에이전트 처리 시작 시 { on: true }, 완료 시 { on: false } 호출.
// DB 저장 없음 — 방에 bot_typing 이벤트만 브로드캐스트한다.
router.post('/:token/typing', validateBotToken, (req, res) => {
  const bot = req.bot;
  const on = req.body?.on !== false; // 기본 true
  const parentMessageId = req.body?.parentMessageId || null;
  const io = req.app.get('io');
  if (io) {
    io.to(`room:${bot.room_id}`).emit('bot_typing', { roomId: bot.room_id, botName: bot.name, on, parentMessageId });
  }
  res.json({ ok: true });
});

export default router;
