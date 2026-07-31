import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// 활성 타임아웃 감시용 Map (taskId -> NodeJS.Timeout)
const activeGuards = new Map();

/**
 * 에이전트 간 서브태스크 생성 및 위임
 * @param {string} fromAgentToken - 요청 봇의 식별값
 * @param {string} toAgentName - 위임받을 봇의 이름 (ai_type 또는 봇 이름)
 * @param {number} roomId - 타겟 채팅방 ID
 * @param {number|null} parentMessageId - 부모 메시지 ID (있다면)
 * @param {object} payload - 태스크 상세 매개변수
 * @param {object} io - Socket.io 서버 인스턴스 (실시간 이벤트 브로드캐스트용)
 */
async function delegateTask(fromAgentToken, toAgentName, roomId, parentMessageId, payload, io) {
  // 1. 발신 봇 확인
  const fromBot = db.prepare('SELECT name FROM bots WHERE token_hash = ?').get(fromAgentToken);
  if (!fromBot) {
    throw new Error('Unauthorized: 발신 봇 토큰이 유효하지 않습니다.');
  }

  // 2. 수신 봇 확인 (활성화된 봇 중 매칭)
  const toBot = db.prepare('SELECT id, name, token_hash FROM bots WHERE name = ? AND is_active = 1').get(toAgentName);
  if (!toBot) {
    throw new Error(`Target Bot '${toAgentName}'가 존재하지 않거나 비활성화되어 있습니다.`);
  }

  const taskId = 'task_' + uuidv4();
  const payloadJson = JSON.stringify(payload);

  // 3. DB에 task 저장
  db.prepare(`
    INSERT INTO agent_tasks (id, from_agent, to_agent, room_id, parent_message_id, payload_json, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(taskId, fromBot.name, toBot.name, roomId, parentMessageId, payloadJson);

  // 4. Socket.io를 통해 수신 봇에게 실시간 이벤트 전송
  if (io) {
    io.to(`room:${roomId}`).emit('task_assigned', {
      taskId,
      fromAgent: fromBot.name,
      toAgent: toBot.name,
      payload
    });
  }

  // 5. 타임아웃 감시 시작 (30초)
  startTimeoutGuard(taskId, roomId, fromBot.name, io);

  return {
    success: true,
    taskId,
    status: 'pending'
  };
}

/**
 * 타임아웃 감시 타이머 실행
 */
function startTimeoutGuard(taskId, roomId, fromAgentName, io) {
  const timeoutMs = 30000; // 30초
  const timer = setTimeout(() => {
    const task = db.prepare('SELECT status FROM agent_tasks WHERE id = ?').get(taskId);
    if (task && task.status === 'pending') {
      db.prepare(`
        UPDATE agent_tasks 
        SET status = 'timeout', completed_at = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        WHERE id = ?
      `).run(taskId);

      console.warn(`[Agent Mesh] Task ${taskId} timed out after 30s.`);

      if (io) {
        io.to(`room:${roomId}`).emit('task_timeout', {
          taskId,
          fromAgent: fromAgentName,
          message: '수신 봇의 응답이 30초 동안 없어 작업이 만료되었습니다.'
        });
      }
    }
    activeGuards.delete(taskId);
  }, timeoutMs);

  activeGuards.set(taskId, timer);
}

/**
 * 위임받은 에이전트의 작업 결과 보고 등록
 * @param {string} toAgentToken - 결과를 전송한 봇의 토큰 해시
 * @param {string} taskId - 완료된 Task ID
 * @param {string} status - 'done' | 'failed'
 * @param {object} result - 결과 페이로드 (Markdown 포함)
 * @param {object} io - Socket.io 인스턴스
 */
async function resolveTask(toAgentToken, taskId, status, result, io) {
  // 1. 수신 봇 검증
  const toBot = db.prepare('SELECT name FROM bots WHERE token_hash = ?').get(toAgentToken);
  if (!toBot) {
    throw new Error('Unauthorized: 수신 봇 토큰이 유효하지 않습니다.');
  }

  // 2. 태스크 존재 확인
  const task = db.prepare('SELECT id, room_id, from_agent, to_agent, status FROM agent_tasks WHERE id = ?').get(taskId);
  if (!task) {
    throw new Error(`Task '${taskId}'를 찾을 수 없습니다.`);
  }

  if (task.status !== 'pending' && task.status !== 'running') {
    throw new Error(`Task '${taskId}'는 이미 완료되었거나 만료되었습니다. (현재 상태: ${task.status})`);
  }

  // 3. 타이머 제거
  if (activeGuards.has(taskId)) {
    clearTimeout(activeGuards.get(taskId));
    activeGuards.delete(taskId);
  }

  const resultStatus = status === 'done' ? 'done' : 'failed';
  const resultJson = JSON.stringify(result);

  // 4. DB 갱신
  db.prepare(`
    UPDATE agent_tasks
    SET status = ?, result_json = ?, completed_at = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    WHERE id = ?
  `).run(resultStatus, resultJson, taskId);

  // 5. 원본 대화방 및 발신 에이전트에게 실시간 브로드캐스트
  if (io) {
    io.to(`room_${task.room_id}`).emit('task_resolved', {
      taskId,
      fromAgent: task.from_agent,
      toAgent: task.to_agent,
      status: resultStatus,
      result
    });

    // 결과를 채팅방에 시스템 메시지 형태로 전송 (선택사항, 에이전트가 직접 답글을 다는 것 외에 시스템 피드로 확인)
    const content = `🤖 [A2A] **${task.to_agent}**가 **${task.from_agent}**의 요청을 완료했습니다.\n\n${result.output_markdown || ''}`;
    
    // DB의 messages 테이블에 인서트 (메인 피드에도 노출시키기 위함)
    // 봇 사용자 ID 조회
    const botUser = db.prepare("SELECT id FROM users WHERE email = 'bot@mytok.local'").get();
    if (botUser) {
      const stmt = db.prepare(`
        INSERT INTO messages (room_id, sender_id, content)
        VALUES (?, ?, ?)
      `);
      const info = stmt.run(task.room_id, botUser.id, content);
      
      io.to(`room_${task.room_id}`).emit('new_message', {
        message: {
          id: info.lastInsertRowid,
          roomId: task.room_id,
          userId: botUser.id,
          userName: `${task.to_agent} (A2A)`,
          content,
          isBot: 1,
          sentAt: new Date().toISOString()
        }
      });
    }
  }

  return {
    success: true,
    taskId,
    status: resultStatus
  };
}

export {
  delegateTask,
  resolveTask
};

export default { delegateTask, resolveTask };
