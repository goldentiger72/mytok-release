import express from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import agentMesh from '../services/agent-mesh.js';

const router = express.Router({ mergeParams: true });

/**
 * 봇 토큰 해싱 헬퍼
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * GET /api/agents/tasks — A2A 서브태스크 목록 조회
 */
router.get('/tasks', requireAuth, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT id, from_agent, to_agent, room_id, status, created_at, completed_at
      FROM agent_tasks
      ORDER BY created_at DESC
      LIMIT 30
    `).all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * GET /api/agents — 활성화된 AI 에이전트 봇 목록 조회
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT id, name, ai_type, is_active, created_at
      FROM bots
      WHERE is_active = 1
    `).all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * POST /bot/:token/delegateTo — 에이전트 간 서브태스크 위임
 */
router.post('/delegateTo', async (req, res) => {
  const { token } = req.params;
  const { to_agent, room_id, parent_message_id = null, payload } = req.body;

  if (!to_agent || !room_id || !payload) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '필수 필드가 누락되었습니다.' });
  }

  const tokenHash = hashToken(token);
  const io = req.app.get('io');

  try {
    const result = await agentMesh.delegateTask(
      tokenHash,
      to_agent,
      parseInt(room_id, 10),
      parent_message_id ? parseInt(parent_message_id, 10) : null,
      payload,
      io
    );
    res.status(202).json(result);
  } catch (err) {
    res.status(err.message.includes('Unauthorized') ? 401 : 400).json({
      error: 'DELEGATION_FAILED',
      message: err.message
    });
  }
});

/**
 * POST /bot/:token/taskResult — 위임 작업의 결과 반환
 */
router.post('/taskResult', async (req, res) => {
  const { token } = req.params;
  const { task_id, status, result } = req.body;

  if (!task_id || !status || !result) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '필수 필드가 누락되었습니다.' });
  }

  const tokenHash = hashToken(token);
  const io = req.app.get('io');

  try {
    const resultStatus = await agentMesh.resolveTask(tokenHash, task_id, status, result, io);
    res.json(resultStatus);
  } catch (err) {
    res.status(err.message.includes('Unauthorized') ? 401 : 400).json({
      error: 'RESOLVE_FAILED',
      message: err.message
    });
  }
});

export default router;
