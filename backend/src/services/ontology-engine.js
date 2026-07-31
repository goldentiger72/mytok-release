import db from '../config/db.js';

/**
 * 온톨로지 노드 추가
 * @param {string} id 
 * @param {string} type - 'Person' | 'Project' | 'Concept' | 'Decision' | 'Task' | 'Event'
 * @param {string} label 
 * @param {object} properties 
 */
function addNode(id, type, label, properties = {}) {
  const propertiesJson = JSON.stringify(properties);
  db.prepare(`
    INSERT INTO ontology_nodes (id, type, label, properties_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      label = excluded.label,
      properties_json = excluded.properties_json
  `).run(id, type, label, propertiesJson);
}

/**
 * 온톨로지 관계(엣지) 추가
 * @param {string} fromNode 
 * @param {string} toNode 
 * @param {string} relation 
 * @param {number} weight 
 */
function addEdge(fromNode, toNode, relation, weight = 1.0) {
  db.prepare(`
    INSERT INTO ontology_edges (from_node, to_node, relation, weight)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(from_node, to_node, relation) DO UPDATE SET
      weight = excluded.weight
  `).run(fromNode, toNode, relation, weight);
}

/**
 * 특정 노드 기준 인접 노드 및 엣지 네트워크 탐색 (Recursive CTE)
 * @param {string} startNodeId 
 * @param {number} maxDepth - 1 ~ 3
 */
function getNetwork(startNodeId, maxDepth = 2) {
  const depthLimit = Math.min(Math.max(maxDepth, 1), 3);

  // 1. Recursive CTE를 활용하여 연관 엣지 탐색
  const edges = db.prepare(`
    WITH RECURSIVE graph_paths(from_node, to_node, relation, weight, depth) AS (
      -- Anchor: 시작 노드에서 출발하는 엣지
      SELECT from_node, to_node, relation, weight, 1
      FROM ontology_edges
      WHERE from_node = ?
      
      UNION ALL
      
      -- Recursive Step: 엣지의 도착 노드에서 출발하는 다음 엣지 탐색
      SELECT e.from_node, e.to_node, e.relation, e.weight, gp.depth + 1
      FROM graph_paths gp
      JOIN ontology_edges e ON gp.to_node = e.from_node
      WHERE gp.depth < ?
    )
    SELECT DISTINCT from_node, to_node, relation, weight FROM graph_paths
  `).all(startNodeId, depthLimit);

  // 2. 수집된 모든 노드 ID 목록 추출
  const nodeIds = new Set();
  edges.forEach(e => {
    nodeIds.add(e.from_node);
    nodeIds.add(e.to_node);
  });

  if (nodeIds.size === 0 && startNodeId) {
    nodeIds.add(startNodeId);
  }

  // 3. 노드 정보 벌크 조회
  const nodesList = [];
  if (nodeIds.size > 0) {
    const placeholders = Array(nodeIds.size).fill('?').join(',');
    const nodes = db.prepare(`
      SELECT id, type, label, properties_json FROM ontology_nodes
      WHERE id IN (${placeholders})
    `).all(...Array.from(nodeIds));

    nodes.forEach(n => {
      nodesList.push({
        id: n.id,
        type: n.type,
        label: n.label,
        properties: JSON.parse(n.properties_json || '{}')
      });
    });
  }

  return {
    nodes: nodesList,
    edges: edges.map(e => ({
      from: e.from_node,
      to: e.to_node,
      relation: e.relation,
      weight: e.weight
    }))
  };
}

/**
 * 대화 텍스트에서 알려진 엔티티 자동 추출 및 매핑 관계 제안
 * (형태소 분석 라이브러리가 없는 경량 구현 환경이므로 DB에 존재하는 노드 라벨명을 기반으로 단순 매칭)
 * @param {string} text 
 */
function extractEntities(text) {
  if (!text) return [];
  const nodes = db.prepare('SELECT id, label, type FROM ontology_nodes').all();
  const matched = [];
  
  nodes.forEach(node => {
    // 라벨 또는 ID가 텍스트에 포함되어 있는지 매칭 (대소문자 무시)
    const regex = new RegExp(`\\b${node.label}\\b|\\b${node.id}\\b`, 'gi');
    if (regex.test(text)) {
      matched.push(node);
    }
  });
  
  return matched;
}

export {
  addNode,
  addEdge,
  getNetwork,
  extractEntities
};

export default { addNode, addEdge, getNetwork, extractEntities };
