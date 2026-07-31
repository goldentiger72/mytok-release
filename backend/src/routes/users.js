import express from 'express';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users — 가입된 사용자 목록 (채팅방 멤버 선택용)
router.get('/', requireAuth, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, display_name, avatar_url, is_owner, is_bot
    FROM users
    ORDER BY is_bot ASC, display_name
  `).all();

  res.json(users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    avatarUrl: u.avatar_url,
    isOwner: Boolean(u.is_owner),
    isBot: Boolean(u.is_bot)
  })));
});

export default router;
