import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import ontologyEngine from '../services/ontology-engine.js';

const router = express.Router();

/**
 * GET /api/ontology/nodes/:id/network — 2-3단계 깊이의 온톨로지 인접 네트워크 조회
 */
router.get('/nodes/:id/network', requireAuth, (req, res) => {
  const { id } = req.params;
  const depth = req.query.depth ? parseInt(req.query.depth, 10) : 2;

  try {
    const network = ontologyEngine.getNetwork(id, depth);
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * POST /api/ontology/nodes — 온톨로지 노드 생성/갱신
 */
router.post('/nodes', requireAuth, (req, res) => {
  const { id, type, label, properties = {} } = req.body;

  if (!id || !type || !label) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '필수 매개변수(id, type, label)가 누락되었습니다.' });
  }
  if (!['Person', 'Project', 'Concept', 'Decision', 'Task', 'Event'].includes(type)) {
    return res.status(400).json({ error: 'INVALID_TYPE', message: '허용되지 않는 노드 유형입니다.' });
  }

  try {
    ontologyEngine.addNode(id, type, label, properties);
    res.json({ success: true, message: 'Node created/updated.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

/**
 * POST /api/ontology/edges — 온톨로지 방향성 관계 엣지 생성/갱신
 */
router.post('/edges', requireAuth, (req, res) => {
  const { from_node, to_node, relation, weight = 1.0 } = req.body;

  if (!from_node || !to_node || !relation) {
    return res.status(400).json({ error: 'INVALID_PARAMETERS', message: '필수 매개변수(from_node, to_node, relation)가 누락되었습니다.' });
  }

  try {
    ontologyEngine.addEdge(from_node, to_node, relation, parseFloat(weight));
    res.json({ success: true, message: 'Edge created/updated.' });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

export default router;
