import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

/**
 * GET /api/wiki/search — SQLite FTS5 매칭을 통한 위키 전문 검색
 */
router.get('/search', requireAuth, (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'EMPTY_QUERY', message: '검색어를 입력하세요.' });
  }

  try {
    // FTS5 MATCH 쿼리를 활용한 최적 텍스트 검색
    const results = db.prepare(`
      SELECT w.id, w.type, w.title, w.content, w.tags, w.updated_at
      FROM wiki_entities w
      JOIN wiki_entities_fts f ON w.id = f.rowid
      WHERE wiki_entities_fts MATCH ?
      ORDER BY bm25(wiki_entities_fts) ASC -- 연관도(bm25) 기준 정렬
    `).all(`${query}*`); // 부분 일치 적용을 위해 와일드카드 접미사 추가

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * POST /api/wiki/entity — 신규 위키 엔티티 생성
 */
router.post('/entity', requireAuth, (req, res) => {
  const { type, title, content, tags = '' } = req.body;

  if (!['entity', 'procedure', 'decision', 'agent-memory'].includes(type)) {
    return res.status(400).json({ error: 'INVALID_TYPE', message: '유효하지 않은 위키 타입입니다.' });
  }
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '제목과 내용을 채워주세요.' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO wiki_entities (type, title, content, tags)
      VALUES (?, ?, ?, ?)
    `).run(type, title.trim(), content.trim(), tags);

    res.status(201).json({
      success: true,
      id: info.lastInsertRowid,
      title: title.trim()
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'DUPLICATE_TITLE', message: '이미 존재하는 제목입니다.' });
    }
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * PATCH /api/wiki/entity/:id — 위키 엔티티 수정
 */
router.patch('/entity/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { type, title, content, tags } = req.body;

  try {
    const existing = db.prepare('SELECT 1 FROM wiki_entities WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: '엔티티를 찾을 수 없습니다.' });

    if (type !== undefined) {
      if (!['entity', 'procedure', 'decision', 'agent-memory'].includes(type)) {
        return res.status(400).json({ error: 'INVALID_TYPE' });
      }
      db.prepare('UPDATE wiki_entities SET type = ? WHERE id = ?').run(type, id);
    }
    if (title !== undefined) {
      db.prepare('UPDATE wiki_entities SET title = ? WHERE id = ?').run(title.trim(), id);
    }
    if (content !== undefined) {
      db.prepare('UPDATE wiki_entities SET content = ? WHERE id = ?').run(content.trim(), id);
    }
    if (tags !== undefined) {
      db.prepare('UPDATE wiki_entities SET tags = ? WHERE id = ?').run(tags, id);
    }

    db.prepare("UPDATE wiki_entities SET updated_at = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) WHERE id = ?").run(id);

    res.json({ success: true, message: '위키 엔티티가 수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * DELETE /api/wiki/entity/:id — 위키 엔티티 삭제
 */
router.delete('/entity/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const existing = db.prepare('SELECT 1 FROM wiki_entities WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: '엔티티를 찾을 수 없습니다.' });

    db.prepare('DELETE FROM wiki_entities WHERE id = ?').run(id);
    res.json({ success: true, message: '위키 엔티티가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

export default router;
