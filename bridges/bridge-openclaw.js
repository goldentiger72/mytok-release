'use strict';
// .env 자체 로딩 — 실행 위치(cwd)와 무관하게 bridges/.env 를 읽는다 (자동 재시작 래퍼 대응)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { spawn } = require('child_process');
const { io: socketIo } = require('socket.io-client');

const BOT_TOKEN      = process.env.OPENCLAW_BOT_TOKEN || process.env.BOT_TOKEN;
const MYTOK_URL      = (process.env.MYTOK_URL || 'http://localhost:3500').replace(/\/$/, '');
const OPENCLAW_BIN   = process.env.OPENCLAW_BIN || 'openclaw';
const OPENCLAW_AGENT = process.env.OPENCLAW_AGENT || 'main';
const TIMEOUT_MS     = parseInt(process.env.OPENCLAW_TIMEOUT_MS || '300000', 10);

if (!BOT_TOKEN) {
  console.error('[OpenClaw Bridge] OPENCLAW_BOT_TOKEN or BOT_TOKEN is required.');
  process.exit(1);
}

let sessionKey = null;
let botRoomId  = null;
let processing = false;

// ── OpenClaw CLI 호출 (크로스플랫폼: macOS 네이티브 / Windows WSL) ─────────────
function runOpenClaw(bashCmd) {
  return new Promise((resolve, reject) => {
    let proc;
    if (process.platform === 'win32') {
      // Windows: WSL 경유
      const fullCmd = `export PATH=$PATH:/home/aiup/.npm-global/bin; ${bashCmd}`;
      proc = spawn('wsl', ['-e', 'bash', '-l', '-c', fullCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } else {
      // macOS / Linux: 네이티브 bash
      proc = spawn('bash', ['-l', '-c', bashCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    proc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Timeout after ' + TIMEOUT_MS + 'ms')); }, TIMEOUT_MS);
    proc.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, code }); });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// 브래킷 카운팅으로 정확한 JSON 오브젝트 추출 (앞뒤 로그 메시지 무시)
function parseOpenClawJson(text) {
  // '\n{' 또는 문자열 시작의 '{'를 JSON 시작으로 인식
  let jsonStart = -1;
  const idx1 = text.indexOf('\n{');
  const idx2 = text.indexOf('\r\n{');
  if (idx1 >= 0 || idx2 >= 0) {
    if (idx1 >= 0 && idx2 >= 0) jsonStart = Math.min(idx1, idx2) + (idx2 < idx1 ? 2 : 1);
    else if (idx1 >= 0) jsonStart = idx1 + 1;
    else jsonStart = idx2 + 2;
  } else if (text.trimStart().startsWith('{')) {
    jsonStart = text.indexOf('{');
  }
  if (jsonStart < 0) return null;

  // 브래킷 카운팅으로 JSON 끝 탐색
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
  }
  if (jsonEnd < 0) return null;

  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (_) {
    return null;
  }
}

async function askOpenClaw(userMessage) {
  // 싱글쿼트 이스케이프: ' → '\''
  const escaped = userMessage.replace(/'/g, "'\\''");
  const skArg = sessionKey ? ` --session-key '${sessionKey}'` : '';
  const cmd = `${OPENCLAW_BIN} agent --agent '${OPENCLAW_AGENT}' --message '${escaped}' --json --no-color${skArg} 2>&1`;

  const { stdout, stderr, code } = await runOpenClaw(cmd);

  if (process.env.DEBUG_BRIDGE) {
    console.log('[DEBUG] stdout length:', stdout.length, '| first 200:', stdout.slice(0, 200));
  }

  const data = parseOpenClawJson(stdout);

  if (!data) {
    const raw = (stdout + stderr).replace(/\r/g, '').trim();
    // 마지막 의미있는 에러 라인만 추출
    const lines = raw.split('\n').filter(l => l.trim());
    const errMsg = lines.slice(-3).join(' | ').slice(0, 250) || `exit ${code}`;
    throw new Error(errMsg);
  }

  // Gateway 응답은 { runId, status, result: { payloads, meta } }로 감싸져 오고,
  // embedded 폴백 응답은 { payloads, meta }로 평평하게 온다. 둘 다 지원.
  const result = data.result || data;

  const reply = (result.payloads && result.payloads[0] && result.payloads[0].text)
    ? result.payloads[0].text.trim()
    : '';

  // sessionKey 보존 (대화 연속성)
  const sk = result.meta?.systemPromptReport?.sessionKey;
  if (sk) sessionKey = sk;

  // 에이전트가 의도적으로 응답하지 않음(NO_REPLY) 또는 빈 응답 → 침묵 신호(null 반환).
  // 이는 정상 동작이며 에러가 아니다. spec Edge Case: "응답 없음 (에러 메시지 없음)".
  if (!reply || result.meta?.finalAssistantVisibleText === 'NO_REPLY') return null;
  return reply;
}

// ── REST API: 봇 메시지 전송 ──────────────────────────────────────────────────
async function sendBotMessage(content, parentMessageId = null) {
  const body = { content };
  if (parentMessageId) body.parentMessageId = parentMessageId;

  const res = await fetch(`${MYTOK_URL}/bot/${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`sendMessage HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// "응답 작성 중" 표시 on/off — 표시용 신호라 실패는 조용히 무시
async function sendTyping(on, parentMessageId = null) {
  try {
    const body = { on };
    if (parentMessageId) body.parentMessageId = parentMessageId;

    await fetch(`${MYTOK_URL}/bot/${BOT_TOKEN}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (_) { /* ignore */ }
}

// ── Socket.io 연결 ────────────────────────────────────────────────────────────
function connectMyTok() {
  const socket = socketIo(MYTOK_URL, {
    auth: { botToken: BOT_TOKEN },  // 서버가 handshake에서 읽음
    query: { botToken: '1' },  // Engine.IO 레벨에서 봇 감지용 (세션 미들웨어 스킵)
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log(`[OpenClaw Bridge] MyTok connected (id: ${socket.id})`);
  });

  socket.on('bot_ready', (data) => {
    botRoomId = data.roomId;
    console.log(`[OpenClaw Bridge] Bot ready: "${data.name}" (room:${botRoomId})`);
  });

  socket.on('error', (err) => {
    console.error('[OpenClaw Bridge] Socket error:', err);
  });

  socket.on('new_message', async (payload) => {
    const msg = payload.message;
    if (!msg) return;
    if (msg.isBot) return;           // 봇 메시지 무시
    if (msg.roomId !== botRoomId) return;

    const text = (msg.content || '').trim();
    if (!text || processing) return;

    // 내장 명령어
    if (text === '/status') {
      await sendBotMessage(`Agent: ${OPENCLAW_AGENT}\nSession: ${sessionKey || '(new)'}`).catch(() => {});
      return;
    }
    if (text === '/reset') {
      sessionKey = null;
      await sendBotMessage('세션이 초기화됐습니다.').catch(() => {});
      return;
    }

    processing = true;
    console.log(`[OpenClaw Bridge] Processing: "${text.slice(0, 60)}"`);
    sendTyping(true); // "응답 작성 중" 표시 시작 (해제는 finally)

    try {
      const reply = await askOpenClaw(text);
      if (reply === null) {
        // 에이전트가 의도적으로 응답 안 함 → 아무것도 보내지 않음 (에러 아님)
        console.log('[OpenClaw Bridge] No reply (agent chose silence).');
      } else {
        await sendBotMessage(reply);
        console.log('[OpenClaw Bridge] Reply sent.');
      }
    } catch (err) {
      // 상세 원인은 서버 로그에만 남기고, 사용자에겐 간결한 안내만 전송
      console.error('[OpenClaw Bridge] Error:', err.message);
      const friendly = /timeout/i.test(err.message)
        ? '⏱️ 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'
        : '⚠️ 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.';
      await sendBotMessage(friendly).catch(() => {});
    } finally {
      processing = false;
      sendTyping(false); // "응답 작성 중" 해제
    }
  });

  socket.on('new_thread_reply', async ({ roomId, messageId, reply }) => {
    if (reply.isBot) return;
    if (roomId !== botRoomId) return;

    const text = (reply.content || '').trim();
    if (!text || processing) return;

    processing = true;
    console.log(`[OpenClaw Bridge] Processing Thread Reply: "${text.slice(0, 60)}"`);
    sendTyping(true, messageId);

    try {
      const botReply = await askOpenClaw(text);
      if (botReply === null) {
        console.log('[OpenClaw Bridge] No reply (agent chose silence).');
      } else {
        await sendBotMessage(botReply, messageId);
        console.log('[OpenClaw Bridge] Thread Reply sent.');
      }
    } catch (err) {
      console.error('[OpenClaw Bridge] Thread Error:', err.message);
      const friendly = /timeout/i.test(err.message)
        ? '⏱️ 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'
        : '⚠️ 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.';
      await sendBotMessage(friendly, messageId).catch(() => {});
    } finally {
      processing = false;
      sendTyping(false, messageId);
    }
  });

  socket.on('disconnect', (r) => console.log(`[OpenClaw Bridge] Disconnected: ${r}`));
  socket.on('connect_error', (e) => console.error(`[OpenClaw Bridge] Connect error: ${e.message}`));
  return socket;
}

// ── 진입점 ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[OpenClaw Bridge] Starting. MyTok: ${MYTOK_URL} | Agent: ${OPENCLAW_AGENT}`);

  if (process.platform === 'win32') {
    const { stdout } = await runWsl(`${OPENCLAW_BIN} --version 2>&1`).catch(() => ({ stdout: '?' }));
    console.log(`[OpenClaw Bridge] openclaw: ${stdout.trim().split('\n')[0].replace(/\r/, '')}`);
  }

  connectMyTok();
}

main().catch((err) => {
  console.error('[OpenClaw Bridge] Init error:', err);
  process.exit(1);
});