import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import obsidianBridge from '../services/obsidian-bridge.js';
import db from '../config/db.js';

const router = express.Router();

/**
 * GET /api/obsidian/search — Obsidian 노트 검색 프록시
 */
router.get('/search', requireAuth, async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'EMPTY_QUERY', message: '검색어를 입력하세요.' });
  }

  try {
    const results = await obsidianBridge.searchNotes(query);
    res.json(results);
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'OBSIDIAN_API_ERROR',
      message: err.message,
      details: err.details
    });
  }
});

/**
 * POST /api/obsidian/save — 메시지를 Obsidian 노트로 저장 및 매핑 기록
 */
router.post('/save', requireAuth, async (req, res) => {
  const { messageId, path, content } = req.body;

  if (!messageId || !path || !content?.trim()) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '필수 매개변수가 누락되었습니다.' });
  }

  try {
    // 1. Obsidian 볼트에 저장
    const result = await obsidianBridge.saveNote(path, content.trim());
    
    // 2. 노트 파일명/제목 추출
    const noteTitle = path.split('/').pop().replace(/\.md$/i, '');

    // 3. SQLite db에 링크 관계 저장
    db.prepare(`
      INSERT OR REPLACE INTO obsidian_links (message_id, note_path, note_title)
      VALUES (?, ?, ?)
    `).run(messageId, path, noteTitle);

    res.status(201).json({
      success: true,
      path: result.path,
      obsidian_url: result.obsidian_url
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: 'OBSIDIAN_API_ERROR',
      message: err.message,
      details: err.details
    });
  }
});

export default router;
