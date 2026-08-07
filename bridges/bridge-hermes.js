'use strict';

/**
 * bridge-hermes.js — Hermes Agent Bridge (OpenAI 호환 API)
 *
 * 실행: node --env-file=.env bridge-hermes.js
 * 설정: .env 파일
 *   HERMES_BOT_TOKEN  — Hermes 전용 봇 토큰 (없으면 BOT_TOKEN 사용)
 *   MYTOK_URL         — MyTok 서버 주소 (기본: http://localhost:3500)
 *   HERMES_URL        — Hermes API 주소 (기본: http://localhost:8642)
 *   HERMES_API_KEY    — Hermes API Key (~/.hermes/.env 의 API_SERVER_KEY)
 *   HERMES_MODEL      — 모델명 (기본: hermes)
 *
 * Hermes 사전 준비 (WSL Ubuntu):
 *   1. ~/.hermes/.env → API_SERVER_ENABLED=true, API_SERVER_KEY=your-secret
 *   2. hermes gateway   ← API 서버 + 메시징 게이트웨이 시작
 *   3. WSL2는 Windows localhost:8642로 자동 포워딩됨
 *
 * [아키텍처 결정 — FR-006 변경]
 * spec.md FR-006은 Ollama HTTP API(localhost:11434) 직접 호출로 설계되었으나,
 * 실제 구현에서는 Hermes Agent API(localhost:8642, OpenAI 호환)를 사용한다.
 * 이유: Hermes Desktop 앱이 멀티-모델 지원(Claude/Gemini/Ollama 통합),
 * 메모리 관리, 도구 실행, 플러그인 시스템을 제공하므로 더 강력한 AI 허브 역할.
 * Ollama 직접 연결은 bridge-hermes-ollama.js (미구현) 로 분리 가능.
 */

// .env 자체 로딩 — 실행 위치와 무관하게 bridges/.env 를 읽는다
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { io: socketIo } = require('socket.io-client');

const BOT_TOKEN   = process.env.HERMES_BOT_TOKEN || process.env.BOT_TOKEN;
const MYTOK_URL   = (process.env.MYTOK_URL  || 'http://localhost:3500').replace(/\/$/, '');
const HERMES_URL  = (process.env.HERMES_URL || 'http://localhost:8642').replace(/\/$/, '');
const HERMES_KEY  = process.env.HERMES_API_KEY || '';
const MODEL       = process.env.HERMES_MODEL || 'hermes';
const TIMEOUT_MS  = 300_000; // 5분 (Hermes Agent 복잡한 작업 대응)

if (!BOT_TOKEN) {
  console.error('[Hermes Bridge] BOT_TOKEN 또는 HERMES_BOT_TOKEN이 필요합니다.');
  process.exit(1);
}

// ── 대화 히스토리 (인메모리) ────────────────────────────────────────────────
const MAX_HISTORY = 20;
const history = [];

function addHistory(role, content) {
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, 1);
}

// ── Hermes API 호출 (OpenAI 호환) ───────────────────────────────────────────
async function askHermes(userMessage) {
  addHistory('user', userMessage);

  const messages = [
    {
      role: 'system',
      content: '당신은 Hermes입니다. MyTok 채팅 앱에 연결된 AI 어시스턴트입니다. 한국어로 자연스럽게 대화하세요.'
    },
    ...history
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (HERMES_KEY) headers['Authorization'] = `Bearer ${HERMES_KEY}`;

    const res = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hermes API HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    if (reply) addHistory('assistant', reply);
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

// ── Hermes 서버 연결 확인 ──────────────────────────────────────────────────
async function checkHermes() {
  try {
    const headers = {};
    if (HERMES_KEY) headers['Authorization'] = `Bearer ${HERMES_KEY}`;
    const res = await fetch(`${HERMES_URL}/v1/models`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = data.data?.map(m => m.id).join(', ') || '(목록 없음)';
    console.log(`[Hermes Bridge] Hermes API 연결됨 — 모델: ${models}`);
    return true;
  } catch (e) {
    console.warn(`[Hermes Bridge] Hermes API 연결 실패: ${e.message}`);
    console.warn(`  → WSL에서 실행: hermes gateway`);
    console.warn(`  → ~/.hermes/.env: API_SERVER_ENABLED=true`);
    return false;
  }
}

// ── MyTok REST API ──────────────────────────────────────────────────────────
async function sendMessage(content, parentMessageId = null) {
  const body = { content };
  if (parentMessageId) body.parentMessageId = parentMessageId;

  const res = await fetch(`${MYTOK_URL}/bot/${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`sendMessage HTTP ${res.status}`);
}

// "응답 작성 중" 표시 on/off — 표시용 신호라 실패는 조용히 무시
async function sendTyping(on, parentMessageId = null) {
  try {
    const body = { on };
    if (parentMessageId) body.parentMessageId = parentMessageId;

    await fetch(`${MYTOK_URL}/bot/${BOT_TOKEN}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (_) { /* ignore */ }
}

// ── 스마트 멘션 & 턴 제어 (Agent-to-Agent 루프 방지) ───────────────────────
let myBotName = process.env.BOT_NAME || 'Hermes';
let botTurns = 0;
const MAX_BOT_TURNS = 5;

function isMentioned(content, name) {
  if (!content) return false;
  const lower = content.toLowerCase();
  if (!name) return lower.includes('@hermes') || lower.includes('@봇');
  
  const cleanName = name.toLowerCase().replace(/\s+/g, '');
  const firstName = cleanName.split(/bot|agent/)[0] || cleanName;
  
  return lower.includes(`@${cleanName}`) || 
         lower.includes(`@${firstName}`) ||
         lower.includes(`@${name.toLowerCase()}`);
}

function shouldProcessMessage(message) {
  // 1. 사람이 보낸 메시지면 연속 봇 턴 카운터 리셋 후 응답
  if (!message.isBot) {
    botTurns = 0;
    return true;
  }

  // 2. 봇 자신이 보낸 메시지는 무시
  if (myBotName && message.senderName === myBotName) {
    return false;
  }

  // 3. 다른 봇이 보낸 메시지인 경우: @멘션이 있을 때만 응답
  if (!isMentioned(message.content, myBotName)) {
    return false;
  }

  // 4. 무한 대화 방지: 연속 봇 턴 제한
  botTurns++;
  if (botTurns > MAX_BOT_TURNS) {
    console.warn(`[Hermes Bridge] ⚠️ 연속 봇 대화 제한(${MAX_BOT_TURNS}회) 도달으로 응답 중단`);
    return false;
  }

  console.log(`[Hermes Bridge] 🤖 봇 멘션 감지 (연속 턴 ${botTurns}/${MAX_BOT_TURNS}): [${message.senderName}] -> "@${myBotName}"`);
  return true;
}

// ── Socket.io 연결 ───────────────────────────────────────────────────────────
let processing = false;

function connect() {
  const socket = socketIo(MYTOK_URL, {
    auth: { botToken: BOT_TOKEN },
    query: { botToken: '1' },  // Engine.IO 레벨에서 봇 감지용 (세션 미들웨어 스킵)
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log(`[Hermes Bridge] MyTok 연결됨 (id: ${socket.id})`);
  });

  socket.on('bot_ready', ({ name, roomId }) => {
    if (name) myBotName = name;
    console.log(`[Hermes Bridge] 봇 인증 완료 — "${name}" (room:${roomId})`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Hermes Bridge] 연결 끊김: ${reason} — 재연결 중...`);
  });

  socket.on('error', (err) => {
    console.error('[Hermes Bridge] Socket 오류:', err?.message || err);
  });

  socket.on('new_message', async ({ message }) => {
    if (!shouldProcessMessage(message)) return;

    if (message.content.trim() === '/status') {
      try {
        const ok = await checkHermes();
        await sendMessage(`🤖 Hermes Bridge\nAPI: ${HERMES_URL}\n상태: ${ok ? '✅ 연결됨' : '❌ 연결 실패'}`);
      } catch (_) {}
      return;
    }

    if (processing) {
      try { await sendMessage('⏳ 이전 요청 처리 중입니다. 잠시 후 다시 시도해 주세요.'); } catch (_) {}
      return;
    }

    processing = true;
    console.log(`[Hermes Bridge] 처리 중: "${message.content.slice(0, 60)}..."`);
    sendTyping(true); // "응답 작성 중" 표시 시작 (해제는 finally)

    try {
      const reply = await askHermes(message.content);
      if (reply) {
        await sendMessage(reply);
        console.log(`[Hermes Bridge] 응답 전송 완료`);
      }
    } catch (e) {
      console.error('[Hermes Bridge] 오류:', e.message);
      try { await sendMessage(`⚠️ Hermes 오류: ${e.message}`); } catch (_) {}
    } finally {
      processing = false;
      sendTyping(false); // "응답 작성 중" 해제
    }
  });

  socket.on('new_thread_reply', async ({ roomId, messageId, reply }) => {
    if (reply.isBot) return;

    const text = (reply.content || '').trim();
    if (!text || processing) return;

    processing = true;
    console.log(`[Hermes Bridge] 스레드 답글 처리 중: "${text.slice(0, 60)}"`);
    sendTyping(true, messageId);

    try {
      const botReply = await askHermes(text);
      if (botReply) {
        await sendMessage(botReply, messageId);
        console.log('[Hermes Bridge] 스레드 답글 응답 전송 완료');
      }
    } catch (err) {
      console.error('[Hermes Bridge] 스레드 오류:', err.message);
      try { await sendMessage(`⚠️ Hermes 오류: ${err.message}`, messageId); } catch (_) {}
    } finally {
      processing = false;
      sendTyping(false, messageId);
    }
  });

  return socket;
}

// ── 시작 ───────────────────────────────────────────────────────────────────
console.log(`[Hermes Bridge] 시작됨. MyTok: ${MYTOK_URL} | Hermes API: ${HERMES_URL}`);
checkHermes().then(() => connect());
