import db from '../config/db.js';
import crypto from 'crypto';
import { triggerBot } from './bot.js';

// Intelligence Layer (선택적) — import 실패 시 null
let ontologyEngine = null;
try { ontologyEngine = await import('../services/ontology-engine.js'); } catch {}

/**
 * Socket.io 이벤트 핸들러
 * contracts/api.md Socket 계약 기준
 */
function registerHandlers(io) {
  io.on('connection', (socket) => {
    // ── 봇 토큰 인증 (Bridge용) ────────────────────────────
    const botToken = socket.handshake.auth?.botToken;
    if (botToken) {

      const tokenHash = crypto.createHash('sha256').update(botToken).digest('hex');
      const bot = db.prepare(
        'SELECT * FROM bots WHERE token_hash = ? AND is_active = 1'
      ).get(tokenHash);

      if (!bot) {
        socket.emit('error', { code: 'BOT_AUTH_FAILED', message: '유효하지 않은 봇 토큰입니다.' });
        socket.disconnect(true);
        return;
      }

      socket.botId = bot.id;
      socket.botRoomId = bot.room_id;
      socket.join(`room:${bot.room_id}`);
      socket.emit('bot_ready', { botId: bot.id, roomId: bot.room_id, name: bot.name });
      console.log(`[Socket] 봇 연결: ${bot.name} (room:${bot.room_id})`);
      return; // 봇은 일반 사용자 이벤트 핸들러 등록 불필요
    }

    // ── 일반 사용자 인증 ──────────────────────────────────
    const user = socket.request.session?.passport?.user
      ? db.prepare('SELECT * FROM users WHERE id = ?').get(socket.request.session.passport.user)
      : null;

    if (!user) {
      socket.emit('error', { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' });
      socket.disconnect(true);
      return;
    }

    // 온라인 상태 갱신
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);

    // 사용자가 속한 방에 자동 조인 (재연결 복구)
    const myRooms = db.prepare('SELECT room_id FROM room_members WHERE user_id = ?').all(user.id);
    myRooms.forEach(({ room_id }) => socket.join(`room:${room_id}`));

    // 같은 방 구성원에게 온라인 알림
    myRooms.forEach(({ room_id }) => {
      socket.to(`room:${room_id}`).emit('user_online', { userId: user.id });
    });

    // ── join_room ─────────────────────────────
    socket.on('join_room', ({ roomId }) => {
      const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, user.id);
      if (!member) {
        socket.emit('error', { code: 'NOT_MEMBER', message: '채팅방 구성원이 아닙니다.' });
        return;
      }
      socket.join(`room:${roomId}`);

      const members = db.prepare(`
        SELECT u.id, u.display_name, u.avatar_url, u.last_seen_at
        FROM users u INNER JOIN room_members rm ON rm.user_id = u.id
        WHERE rm.room_id = ?
      `).all(roomId);

      socket.emit('room_joined', { roomId, members });
    });

    // ── send_message ──────────────────────────
    socket.on('send_message', ({ roomId, content }) => {
      if (!content?.trim()) return;

      const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, user.id);
      if (!member) {
        socket.emit('error', { code: 'NOT_MEMBER' });
        return;
      }

      const saveMsgTx = db.transaction(() => {
        const inserted = db.prepare(
          'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?) RETURNING id'
        ).get(roomId, user.id, content.trim());
        db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)').run(inserted.id, user.id);
        return inserted.id;
      });

      const messageId = saveMsgTx();

      // LLM Wiki FTS5 전문 검색 (US4)
      let wikiContext = null;
      try {
        const queryTerm = content.trim().replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
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
        console.error('[Socket Wiki Search Error]', err.message);
      }

      const message = {
        id: messageId,
        roomId,
        senderId: user.id,
        senderName: user.display_name,
        senderAvatar: user.avatar_url,
        content: content.trim(),
        sentAt: new Date().toISOString(),
        readStatus: getReadStatus(messageId, roomId, user.id),
        attachment: null,
        wikiContext // 봇이 프롬프트 구성 시 즉시 참조 가능
      };

      io.to(`room:${roomId}`).emit('new_message', { message });

      // 온톨로지 관계 자동 매핑 (US5)
      try {
        if (!ontologyEngine) throw new Error('skip');
        const { extractEntities, addEdge } = ontologyEngine;
        const matched = extractEntities(content.trim());
        matched.forEach(node => {
          const msgNodeId = `msg_${messageId}`;
          const properties = {
            senderId: user.id,
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
        console.error('[Socket Ontology Link Error]', err.message);
      }

      // 봇이 해당 방에 있으면 응답 처리
      triggerBot(io, roomId, content.trim());
    });

    // ── message_read ──────────────────────────
    socket.on('message_read', ({ messageId, roomId }) => {
      // 1. 방 멤버십 검증
      const isMember = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, user.id);
      if (!isMember) return;

      // 2. 메시지의 실제 방 소속 검증
      const isValidMsg = db.prepare('SELECT 1 FROM messages WHERE id = ? AND room_id = ?').get(messageId, roomId);
      if (!isValidMsg) return;

      // 이미 읽은 경우 무시
      const already = db.prepare('SELECT 1 FROM message_reads WHERE message_id = ? AND user_id = ?').get(messageId, user.id);
      if (already) return;

      db.prepare('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)').run(messageId, user.id);

      const unreadCount = getUnreadCount(messageId, roomId);
      io.to(`room:${roomId}`).emit('read_updated', { messageId, userId: user.id, unreadCount });
    });

    // ── disconnect ────────────────────────────
    socket.on('disconnect', () => {
      db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
      myRooms.forEach(({ room_id }) => {
        socket.to(`room:${room_id}`).emit('user_offline', { userId: user.id });
      });
    });
  });
}

function getReadStatus(messageId, roomId, senderId) {
  const room = db.prepare('SELECT type FROM rooms WHERE id = ?').get(roomId);
  if (!room) return null;

  if (room.type === 'direct') {
    return { type: 'direct', isRead: false };
  }
  const memberCount = db.prepare('SELECT COUNT(*) AS cnt FROM room_members WHERE room_id = ?').get(roomId).cnt;
  return { type: 'unread_count', value: Math.max(0, memberCount - 1) };
}

function getUnreadCount(messageId, roomId) {
  const memberCount = db.prepare('SELECT COUNT(*) AS cnt FROM room_members WHERE room_id = ?').get(roomId).cnt;
  const readCount = db.prepare('SELECT COUNT(*) AS cnt FROM message_reads WHERE message_id = ?').get(messageId).cnt;
  return Math.max(0, memberCount - readCount - 1); // 발신자 제외
}

export { registerHandlers };
