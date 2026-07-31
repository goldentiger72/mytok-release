import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { triggerBot } from '../socket/bot.js';
import { uploadFile } from '../middleware/upload.js';

// Intelligence Layer (선택적) — import 실패 시 null
let ontologyEngine = null;
try { ontologyEngine = await import('../services/ontology-engine.js'); } catch {}

const router = express.Router({ mergeParams: true });

// GET /api/rooms/:id/messages — 메시지 목록 (최근 50건 페이징)
router.get('/', requireAuth, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const before = req.query.before ? parseInt(req.query.before, 10) : null;

  // 구성원 여부 확인
  const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!member) return res.status(403).json({ error: 'NOT_MEMBER' });

  // 방 유형 파악
  const room = db.prepare('SELECT type FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  const memberCount = db.prepare('SELECT COUNT(*) AS cnt FROM room_members WHERE room_id = ?').get(roomId).cnt;

  // 메시지 조회
  const query = before
    ? 'SELECT * FROM messages WHERE room_id = ? AND id < ? ORDER BY sent_at DESC LIMIT 50'
    : 'SELECT * FROM messages WHERE room_id = ? ORDER BY sent_at DESC LIMIT 50';
  const rawMessages = before
    ? db.prepare(query).all(roomId, before)
    : db.prepare(query).all(roomId);

  const messages = rawMessages.reverse().map(msg => {
    const sender = db.prepare('SELECT id, display_name, avatar_url FROM users WHERE id = ?').get(msg.sender_id);

    // 읽음 상태
    let readStatus;
    if (room.type === 'direct') {
      const isRead = !!db.prepare('SELECT 1 FROM message_reads WHERE message_id = ? AND user_id != ?').get(msg.id, msg.sender_id);
      readStatus = { type: 'direct', isRead };
    } else {
      const readCount = db.prepare('SELECT COUNT(*) AS cnt FROM message_reads WHERE message_id = ?').get(msg.id).cnt;
      const unreadCount = Math.max(0, memberCount - readCount - (msg.sender_id === userId ? 0 : 1));
      readStatus = { type: 'unread_count', value: unreadCount };
    }

    // 첨부 파일
    const attachment = msg.has_attachment
      ? db.prepare('SELECT * FROM attachments WHERE message_id = ?').get(msg.id)
      : null;

    // 스레드 정보 (US3)
    const thread = db.prepare('SELECT id FROM threads WHERE parent_message_id = ?').get(msg.id);
    const threadCount = thread
      ? db.prepare('SELECT COUNT(*) AS cnt FROM thread_messages WHERE thread_id = ?').get(thread.id).cnt
      : 0;

    return {
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      senderName: sender?.display_name,
      senderAvatar: sender?.avatar_url,
      content: msg.content,
      sentAt: msg.sent_at,
      readStatus,
      threadId: thread ? thread.id : null,
      threadCount,
      attachment: attachment ? {
        id: attachment.id,
        originalName: attachment.original_name,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
        url: `/api/files/${attachment.stored_name}`
      } : null
    };
  });

  const hasMore = rawMessages.length === 50;
  res.json({ messages, hasMore });
});

// POST /api/rooms/:id/messages — REST로 메시지 전송 (Web Share Target 등 비-Socket 클라이언트용)
router.post('/', requireAuth, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const content = (req.body.content || '').trim();

  if (!content) return res.status(400).json({ error: 'EMPTY_CONTENT' });

  // 구성원 여부 확인
  const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!member) return res.status(403).json({ error: 'NOT_MEMBER' });

  // DB 저장
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?)'
  ).run(roomId, userId, content);

  // LLM Wiki FTS5 전문 검색 (US4)
  let wikiContext = null;
  try {
    const queryTerm = content.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
    if (queryTerm.length >= 2) {
      const wikiResults = db.prepare(`
        SELECT w.title, w.content FROM wiki_entities w
        JOIN wiki_entities_fts f ON w.id = f.rowid
        WHERE wiki_entities_fts MATCH ?
        LIMIT 3
      `).all(`${queryTerm}*`);
      if (wikiResults.length > 0) {
        wikiContext = wikiResults.map(w => `[Wiki 지식: ${w.title}]\n${w.content}`).join('\n\n');
      }
    }
  } catch (err) {
    console.error('[REST Wiki Search Error]', err.message);
  }

  const user = req.user;
  const message = {
    id: lastInsertRowid,
    roomId,
    senderId: userId,
    senderName: user.display_name,
    senderAvatar: user.avatar_url,
    content,
    sentAt: new Date().toISOString(),
    readStatus: null,
    attachment: null,
    wikiContext
  };

  // Socket.io 브로드캐스트
  const io = req.app.get('io');
  if (io) io.to(`room:${roomId}`).emit('new_message', { message });

  // 온톨로지 관계 자동 매핑 (US5)
  try {
    if (!ontologyEngine) throw new Error('skip');
    const { extractEntities, addEdge } = ontologyEngine;
    const matched = extractEntities(content.trim());
    matched.forEach(node => {
      const msgNodeId = `msg_${lastInsertRowid}`;
      const properties = {
        senderId: userId,
        sentAt: message.sentAt,
        roomId: roomId
      };
      db.prepare(`
        INSERT INTO ontology_nodes (id, type, label, properties_json)
        VALUES (?, 'Event', ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).run(msgNodeId, content.trim().substring(0, 30), JSON.stringify(properties));

      addEdge(msgNodeId, node.id, 'mentions', 1.0);
    });
  } catch (err) {
    console.error('[REST Ontology Link Error]', err.message);
  }

  // 봇 트리거
  if (io) triggerBot(io, roomId, content);

  res.status(201).json({ ok: true, messageId: lastInsertRowid, sentAt: message.sentAt });
});

// ── 스레드 관련 엔드포인트 (US3) ──

// POST /api/rooms/:id/messages/:msgId/thread — 특정 메시지에 스레드 개설
router.post('/:msgId/thread', requireAuth, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const msgId = parseInt(req.params.msgId, 10);
  const userId = req.user.id;
  const { title } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'EMPTY_TITLE', message: '스레드 제목을 입력하세요.' });
  }

  try {
    // 1. 메시지 존재 여부 확인
    const msg = db.prepare('SELECT id, content FROM messages WHERE id = ? AND room_id = ?').get(msgId, roomId);
    if (!msg) return res.status(404).json({ error: 'MSG_NOT_FOUND', message: '원본 메시지를 찾을 수 없습니다.' });

    // 2. 이미 해당 메시지에 생성된 스레드가 있는지 확인
    const existing = db.prepare('SELECT id, title FROM threads WHERE parent_message_id = ?').get(msgId);
    if (existing) {
      return res.json({ success: true, threadId: existing.id, title: existing.title, isNew: false });
    }

    // 3. 스레드 생성
    const threadId = 'th_' + uuidv4();
    db.prepare(`
      INSERT INTO threads (id, room_id, parent_message_id, title, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(threadId, roomId, msgId, title.trim(), userId);

    // 최초 시스템 메시지를 스레드에 기입할 수 있음
    res.status(201).json({ success: true, threadId, title: title.trim(), isNew: true });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// GET /api/rooms/:id/messages/:msgId/thread — 스레드 세부 대화 조회
router.get('/:msgId/thread', requireAuth, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const msgId = parseInt(req.params.msgId, 10);

  try {
    const thread = db.prepare('SELECT * FROM threads WHERE parent_message_id = ? AND room_id = ?').get(msgId, roomId);
    if (!thread) return res.status(404).json({ error: 'THREAD_NOT_FOUND', message: '해당 메시지에 스레드가 존재하지 않습니다.' });

    const rawReplies = db.prepare(`
      SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY created_at ASC
    `).all(thread.id);

    const replies = rawReplies.map(rep => {
      const sender = db.prepare('SELECT display_name, avatar_url FROM users WHERE id = ?').get(rep.user_id);
      return {
        id: rep.id,
        threadId: rep.thread_id,
        userId: rep.user_id,
        senderName: sender?.display_name,
        senderAvatar: sender?.avatar_url,
        content: rep.content,
        isBot: rep.is_bot,
        createdAt: rep.created_at,
        attachment: rep.attachment_url ? {
          url: rep.attachment_url,
          mime: rep.attachment_mime,
          size: rep.attachment_size,
          originalName: rep.attachment_original_name
        } : null
      };
    });

    res.json({
      threadId: thread.id,
      title: thread.title,
      parentMessageId: thread.parent_message_id,
      createdBy: thread.created_by,
      createdAt: thread.created_at,
      replies
    });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/rooms/:id/messages/:msgId/thread/reply — 스레드 답글 달기 (multipart/form-data 지원)
router.post('/:msgId/thread/reply', requireAuth, uploadFile.single('file'), (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const msgId = parseInt(req.params.msgId, 10);
  const userId = req.user.id;
  const content = (req.body.content || '').trim();
  const file = req.file;

  if (!content && !file) {
    return res.status(400).json({ error: 'EMPTY_CONTENT', message: '내용 또는 파일을 입력하세요.' });
  }

  try {
    const thread = db.prepare('SELECT id FROM threads WHERE parent_message_id = ? AND room_id = ?').get(msgId, roomId);
    if (!thread) return res.status(404).json({ error: 'THREAD_NOT_FOUND', message: '스레드가 생성되지 않았습니다.' });

    // 첨부파일 메타데이터
    let attachment = null;
    if (file) {
      const isImage = file.mimetype.startsWith('image/');
      const subdir = isImage ? 'images' : 'files';
      attachment = {
        url: `/api/files/${file.filename}`,
        mime: file.mimetype,
        size: file.size,
        originalName: file.originalname
      };
    }

    const replyId = 'rep_' + uuidv4();
    db.prepare(`
      INSERT INTO thread_messages (id, thread_id, user_id, content, is_bot,
        attachment_url, attachment_mime, attachment_size, attachment_original_name)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      replyId, thread.id, userId, content || '',
      attachment?.url || null,
      attachment?.mime || null,
      attachment?.size || null,
      attachment?.originalName || null
    );

    const reply = {
      id: replyId,
      threadId: thread.id,
      userId,
      senderName: req.user.display_name,
      senderAvatar: req.user.avatar_url,
      content: content || '',
      isBot: 0,
      createdAt: new Date().toISOString(),
      attachment
    };

    // 실시간 소켓으로 브로드캐스트
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${roomId}`).emit('new_thread_reply', {
        roomId,
        messageId: msgId,
        reply
      });
    }

    res.status(201).json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

export default router;
