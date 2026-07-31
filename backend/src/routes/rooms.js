import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

const router = express.Router();

// GET /api/rooms — 내가 속한 채팅방 목록 (unreadCount 포함)
router.get('/', requireAuth, (req, res) => {
  const userId = req.user.id;

  const rooms = db.prepare(`
    SELECT r.id, r.type, r.name, r.created_at, r.category_id,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count,
      (SELECT m.content FROM messages m WHERE m.room_id = r.id ORDER BY m.sent_at DESC LIMIT 1) AS last_content,
      (SELECT m.sent_at FROM messages m WHERE m.room_id = r.id ORDER BY m.sent_at DESC LIMIT 1) AS last_sent_at,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.room_id = r.id
          AND m.sender_id != ?
          AND m.id NOT IN (SELECT mr.message_id FROM message_reads mr WHERE mr.user_id = ?)
      ) AS unread_count
    FROM rooms r
    INNER JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ?
    ORDER BY last_sent_at DESC NULLS LAST
  `).all(userId, userId, userId);

  res.json(rooms.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    categoryId: r.category_id,
    memberCount: r.member_count,
    lastMessage: r.last_content ? { content: r.last_content, sentAt: r.last_sent_at } : null,
    unreadCount: r.unread_count
  })));
});

// GET /api/rooms/:id — 채팅방 상세 (구성원 목록 포함)
router.get('/:id', requireAuth, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  // 구성원 여부 확인
  const member = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!member) return res.status(403).json({ error: 'NOT_MEMBER', message: '채팅방 구성원이 아닙니다.' });

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: '채팅방을 찾을 수 없습니다.' });

  const members = db.prepare(`
    SELECT u.id, u.display_name, u.avatar_url, u.is_owner, u.last_seen_at
    FROM users u
    INNER JOIN room_members rm ON rm.user_id = u.id AND rm.room_id = ?
  `).all(roomId);

  res.json({ ...room, members });
});

// POST /api/rooms — 채팅방 생성 (소유자만)
router.post('/', requireAuth, requireOwner, (req, res) => {
  const { type, name, memberIds = [], withBot = false, categoryId = null } = req.body;
  const createdBy = req.user.id;

  if (!['direct', 'group', 'self'].includes(type)) {
    return res.status(400).json({ error: 'INVALID_TYPE', message: 'type은 direct, group, self 중 하나여야 합니다.' });
  }
  if (type === 'direct' && memberIds.length !== 1) {
    return res.status(400).json({ error: 'INVALID_MEMBERS', message: 'direct 채팅방은 구성원 1명만 지정하세요.' });
  }
  if (type === 'self' && memberIds.length > 0) {
    return res.status(400).json({ error: 'INVALID_MEMBERS', message: 'self 채팅방은 구성원을 지정하지 않습니다.' });
  }

  const createRoom = db.transaction(() => {
    const roomName = type === 'self' ? '나와의 채팅' : (name || null);
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO rooms (type, name, category_id, created_by) VALUES (?, ?, ?, ?)'
    ).run(type, roomName, categoryId, createdBy);

    const roomId = lastInsertRowid;
    // 소유자 추가
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, createdBy);
    // 초대 구성원 추가
    const addMember = db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)');
    memberIds.forEach(uid => addMember.run(roomId, uid));

    // 봇 추가 (withBot=true 또는 봇과의 채팅 요청 시)
    if (withBot) {
      const bot = db.prepare("SELECT id FROM users WHERE is_bot = 1 LIMIT 1").get();
      if (bot) addMember.run(roomId, bot.id);
    }

    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  });

  const room = createRoom();
  res.status(201).json(room);
});

// POST /api/rooms/:id/members — 구성원 초대 (소유자만)
router.post('/:id/members', requireAuth, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const { userId } = req.body;

  const room = db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  const user = db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, userId);
  res.json({ message: '구성원이 추가되었습니다.' });
});

// DELETE /api/rooms/:id/members/:userId — 구성원 내보내기 (소유자만)
router.delete('/:id/members/:userId', requireAuth, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const targetId = parseInt(req.params.userId, 10);

  db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, targetId);
  res.json({ message: '구성원이 제거되었습니다.' });
});

// PATCH /api/rooms/:id — 채팅방 이름 변경 (소유자만)
router.patch('/:id', requireAuth, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'INVALID_NAME', message: '채팅방 이름을 입력하세요.' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(name.trim(), roomId);

  // 같은 방 구성원에게 이름 변경 알림 (Socket 브로드캐스트)
  const io = req.app.get('io');
  io.to(`room:${roomId}`).emit('room_updated', { roomId, name: name.trim() });

  res.json({ ...room, name: name.trim() });
});

// ── 카테고리 관련 엔드포인트 (US3) ──

// GET /api/categories — 카테고리 목록 조회 (parent_id 포함)
router.get('/categories/all', requireAuth, (req, res) => {
  try {
    const list = db.prepare('SELECT id, name, sort_order, parent_id, created_at FROM categories ORDER BY sort_order ASC, created_at ASC').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/categories — 카테고리 생성 (소유자만, parentId 지원)
router.post('/categories', requireAuth, requireOwner, (req, res) => {
  const { name, sortOrder = 0, parentId = null } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'INVALID_NAME', message: '카테고리 이름을 입력하세요.' });
  }

  try {
    // parentId 검증
    if (parentId) {
      const parent = db.prepare('SELECT id FROM categories WHERE id = ?').get(parentId);
      if (!parent) return res.status(404).json({ error: 'PARENT_NOT_FOUND', message: '부모 카테고리를 찾을 수 없습니다.' });

      // 깊이 제한 검증: 부모의 현재 깊이 계산
      const depth = db.prepare(`
        WITH RECURSIVE depth AS (
          SELECT id, parent_id, 1 AS level FROM categories WHERE id = ?
          UNION ALL
          SELECT d.id, c.parent_id, d.level + 1
          FROM depth d JOIN categories c ON d.parent_id = c.id
        )
        SELECT MAX(level) AS maxLevel FROM depth
      `).get(parentId);
      if (depth && depth.maxLevel >= 3) {
        return res.status(400).json({ error: 'MAX_DEPTH', message: '최대 3단계까지 생성할 수 있습니다.' });
      }
    }

    const id = 'cat_' + uuidv4();
    db.prepare('INSERT INTO categories (id, name, sort_order, parent_id) VALUES (?, ?, ?, ?)')
      .run(id, name.trim(), sortOrder, parentId);

    res.status(201).json({ id, name: name.trim(), sortOrder, parentId });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// PATCH /api/categories/:id — 카테고리 속성 변경 (소유자만, parentId 변경 + 순환참조/깊이 검증)
router.patch('/categories/:id', requireAuth, requireOwner, (req, res) => {
  const { name, sortOrder, parentId } = req.body;
  const { id } = req.params;

  try {
    const cat = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' });

    if (name !== undefined) {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id);
    }
    if (sortOrder !== undefined) {
      db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(sortOrder, id);
    }
    if (parentId !== undefined) {
      // 자기 참조 방지
      if (parentId === id) {
        return res.status(400).json({ error: 'SELF_REF', message: '자기 자신을 부모로 설정할 수 없습니다.' });
      }
      if (parentId) {
        // 부모 존재 확인
        const parent = db.prepare('SELECT id FROM categories WHERE id = ?').get(parentId);
        if (!parent) return res.status(404).json({ error: 'PARENT_NOT_FOUND', message: '부모 카테고리를 찾을 수 없습니다.' });

        // 순환 참조 방지: 조상 체인에 자기 자신이 있는지 확인
        const circular = db.prepare(`
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM categories WHERE id = ?
            UNION ALL
            SELECT c.id, c.parent_id FROM categories c JOIN ancestors a ON c.id = a.parent_id
          )
          SELECT 1 FROM ancestors WHERE id = ? LIMIT 1
        `).get(parentId, id);
        if (circular) {
          return res.status(400).json({ error: 'CIRCULAR_REF', message: '순환 참조가 발생합니다.' });
        }

        // 깊이 제한 검증: 이동 후 최대 깊이 확인
        const parentDepth = db.prepare(`
          WITH RECURSIVE depth AS (
            SELECT id, parent_id, 1 AS level FROM categories WHERE id = ?
            UNION ALL
            SELECT d.id, c.parent_id, d.level + 1
            FROM depth d JOIN categories c ON d.parent_id = c.id
          )
          SELECT MAX(level) AS maxLevel FROM depth
        `).get(parentId);

        const subtreeDepth = db.prepare(`
          WITH RECURSIVE sub AS (
            SELECT id, 1 AS level FROM categories WHERE id = ?
            UNION ALL
            SELECT c.id, s.level + 1 FROM categories c JOIN sub s ON c.parent_id = s.id
          )
          SELECT MAX(level) AS maxLevel FROM sub
        `).get(id);

        const totalDepth = (parentDepth?.maxLevel || 0) + (subtreeDepth?.maxLevel || 1);
        if (totalDepth > 3) {
          return res.status(400).json({ error: 'MAX_DEPTH', message: '이동 시 최대 3단계를 초과합니다.' });
        }
      }
      db.prepare('UPDATE categories SET parent_id = ? WHERE id = ?').run(parentId || null, id);
    }

    res.json({ success: true, message: '카테고리가 갱신되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// DELETE /api/categories/:id — 카테고리 삭제 (소유자만)
router.delete('/categories/:id', requireAuth, requireOwner, (req, res) => {
  const { id } = req.params;

  try {
    const cat = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'NOT_FOUND', message: '카테고리를 찾을 수 없습니다.' });

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: '카테고리가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// PATCH /api/rooms/:id/category — 방의 카테고리 매핑 설정 (소유자만)
router.patch('/:id/category', requireAuth, requireOwner, (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const { categoryId } = req.body;

  try {
    const room = db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

    if (categoryId) {
      const cat = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId);
      if (!cat) return res.status(404).json({ error: 'CATEGORY_NOT_FOUND' });
    }

    db.prepare('UPDATE rooms SET category_id = ? WHERE id = ?').run(categoryId || null, roomId);
    res.json({ success: true, roomId, categoryId });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

export default router;
