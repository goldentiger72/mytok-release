'use strict';

/**
 * bridge-claude-code.js — Claude Code CLI Bridge (Socket.io 이벤트 방식)
 *
 * 실행: node --env-file=.env bridge-claude-code.js
 * 설정: .env 파일 (BOT_TOKEN, MYTOK_URL)
 * 사전 조건: `claude` CLI PATH에 설치
 *
 * dotenv 불필요 — Node.js 20.6+ 내장 --env-file 플래그 사용
 * socket.io-client 필요 — npm install (bridges/ 최초 1회)
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { spawn } = require('child_process');
const { io: socketIo } = require('socket.io-client');

// .env 자체 로딩 — 실행 위치와 무관하게 bridges/.env 를 읽는다
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BOT_TOKEN   = process.env.BOT_TOKEN;
const MYTOK_URL   = (process.env.MYTOK_URL || 'http://localhost:3500').replace(/\/$/, '');
const TIMEOUT_MS  = parseInt(process.env.CLAUDE_TIMEOUT_MS, 10) || 180000; // 기본 3분 (파일 작업 포함 시 60초 초과 빈번)
const CLAUDE_CWD  = process.env.CLAUDE_CWD || process.cwd();
// 업로드 파일 로컬 경로 — 서버와 같은 머신에서 실행되므로 직접 접근 가능
const UPLOADS_DIR = process.env.MYTOK_UPLOADS_DIR ||
    path.resolve(__dirname, '..', 'backend', 'uploads');

// 대화 히스토리 (메모리, 재시작 시 초기화)
const MAX_HISTORY = 10; // 최근 N턴 유지
const history = []; // [{ role: 'user'|'assistant', content: string }]

function addHistory(role, content) {
  history.push({ role, content });
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2); // 오래된 것 제거
}

function buildPrompt(userMessage, attachmentPath = null) {
  const historyText = history.length > 0
    ? '=== 이전 대화 ===\n' + history.map(h =>
        `${h.role === 'user' ? '사용자' : '어시스턴트'}: ${h.content}`
      ).join('\n') + '\n=== 대화 끝 ===\n\n'
    : '';

  const isFirstMessage = history.length <= 1;

  const baseInstruction = `당신은 Claude (Anthropic)입니다. MyTok 채팅 앱에서 대화하고 있습니다.
규칙:
- 새 인사말(안녕하세요 등) 없이 바로 답변하세요${isFirstMessage ? '. 첫 메시지라면 간단히 소개해도 됩니다.' : '.'}
- 자신을 소개할 때: "저는 Claude입니다. claude.ai 구독을 통해 연결되었습니다."
- 코딩 질문이면 코드로, 일반 대화면 자연스럽게 답변하세요.
- 한국어로 답변하세요.
- 비대화형 실행(print mode) 환경입니다. 파일 생성/편집이나 도구를 실행할 때 사용자 동의(y/n)를 구하는 질문이나 git commit 여부를 묻는 대화형 인터랙션을 절대 유도하지 마십시오. 모든 파일 쓰기와 도구 실행은 즉각적으로 자율 완료해야 합니다.`;

  if (attachmentPath) {
    const ext = path.extname(attachmentPath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    
    let fileInstruction = '';
    if (isImage) {
      fileInstruction = `위 파일은 이미지 파일입니다. (바이너리 파일이므로 Read 도구로 직접 텍스트 로딩을 시도해 파일이 깨지는 오작동을 피하고, 이미지 파일의 위치 정보 및 속성 기반으로 분석하여 답변하세요.)`;
    } else {
      fileInstruction = `위 경로의 파일을 Read 도구로 직접 읽어 내용을 분석한 후 답변하세요.`;
    }

    return `${baseInstruction}

${historyText}사용자가 파일을 첨부했습니다.
파일 경로: ${attachmentPath}

${fileInstruction}
사용자 메시지: ${userMessage}
어시스턴트:`;
  }

  return `${baseInstruction}

${historyText}사용자: ${userMessage}
어시스턴트:`;
}

// Windows: npm global 패키지는 claude.cmd로 설치됨
const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude';

if (!BOT_TOKEN) {
  console.error('[Claude Code Bridge] BOT_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

// ── REST API 헬퍼 ──────────────────────────────────────────────────────────

async function sendMessage(content, parentMessageId = null) {
  const body = { content };
  if (parentMessageId) body.parentMessageId = parentMessageId;

  const res = await fetch(`${MYTOK_URL}/bot/${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`sendMessage 실패: HTTP ${res.status}`);
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
      body: JSON.stringify(body)
    });
  } catch (_) { /* ignore */ }
}

// ── Claude Code 실행 ───────────────────────────────────────────────────────

async function runClaudeCode(prompt) {
  // ANTHROPIC_API_KEY가 있으면 claude.ai 구독 로그인을 덮어쓰므로 제거
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;

  // 봇 전용 격리 설정 폴더 지정 (사용자 대화 세션과의 파일 락 충돌 차단)
  const clConfigDir = path.join(os.homedir(), '.claude-mytok');
  if (!fs.existsSync(clConfigDir)) {
    fs.mkdirSync(clConfigDir, { recursive: true });
  }
  childEnv.CLAUDE_CONFIG_DIR = clConfigDir;

  // 글로벌 MCP 설정이 봇 전용 격리 폴더에도 반영되도록 복사/동기화
  const globalConfigPath = path.join(os.homedir(), '.claude.json');
  const localConfigPath = path.join(clConfigDir, 'config.json');
  if (fs.existsSync(globalConfigPath)) {
    try {
      fs.copyFileSync(globalConfigPath, localConfigPath);
    } catch (e) {
      console.error('[Claude Code Bridge] 글로벌 설정 파일 복사 실패:', e);
    }
  }

  return new Promise((resolve, reject) => {
    // Windows: cmd.exe /c 를 통해 claude.cmd 실행
    const [cmd, args] = process.platform === 'win32'
      ? ['cmd', ['/c', 'claude', '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', '-p', prompt, '--output-format', 'text']]
      : ['claude', ['--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', '-p', prompt, '--output-format', 'text']];

    console.log(`[Claude Code Bridge] 프롬프트 길이: ${prompt.length}자`);

    const proc = spawn(cmd, args, { env: childEnv, cwd: CLAUDE_CWD });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      const lastStdout = stdout.slice(-1000);
      const lastStderr = stderr.slice(-1000);
      reject(new Error(`응답 시간이 초과되었습니다 (60초).\n\n[터미널 출력]:\n${lastStdout}\n\n[에러 출력]:\n${lastStderr}`));
    }, TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(stderr.trim() || `종료 코드: ${code}`));
      }
      resolve(stdout.trim());
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── Socket.io 연결 ─────────────────────────────────────────────────────────

let processing = false; // 동시 요청 방지 (Claude Code는 1회 1개 처리)

function connect() {
  const socket = socketIo(MYTOK_URL, {
    auth: { botToken: BOT_TOKEN },
    query: { botToken: '1' },  // Engine.IO 레벨에서 봇 감지용 (세션 미들웨어 스킵)
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log(`[Claude Code Bridge] 서버 연결됨 (id: ${socket.id})`);
  });

  socket.on('bot_ready', ({ name, roomId }) => {
    console.log(`[Claude Code Bridge] 봇 인증 완료 — "${name}" (room:${roomId}) | 타임아웃: ${TIMEOUT_MS / 1000}초`);
  });

  socket.on('error', (err) => {
    console.error('[Claude Code Bridge] 서버 오류:', err.message || err);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Claude Code Bridge] 연결 끊김:', reason, '— 재연결 시도 중...');
  });

  socket.on('reconnect', (attempt) => {
    console.log(`[Claude Code Bridge] 재연결 성공 (시도 ${attempt}회)`);
  });

  // ── 핵심: 메시지 이벤트 수신 ────────────────────────────────────────────
  socket.on('new_message', async ({ message }) => {
    // 봇 자신이 보낸 메시지 무시
    if (message.isBot) return;

    // /status 명령어
    if (message.content.trim() === '/status') {
      try { await sendMessage('💻 Claude Code Bridge 실행 중입니다.'); } catch (_) {}
      return;
    }

    // 동시 요청 방지
    if (processing) {
      try { await sendMessage('⏳ 이전 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.'); } catch (_) {}
      return;
    }

    processing = true;

    // 첨부파일 처리: 로컬 경로 탐색 (HTTP 다운로드 없이 직접 접근)
    let attachmentPath = null;
    let userContent = message.content;

    if (message.attachment) {
      const att = message.attachment;
      const storedName = att.url.split('/').pop();
      let originalAttachmentPath = null;

      // files/ → images/ 순서로 실제 파일 위치 탐색
      for (const sub of ['files', 'images']) {
        const candidate = path.join(UPLOADS_DIR, sub, storedName);
        if (fs.existsSync(candidate)) {
          originalAttachmentPath = candidate;
          break;
        }
      }
      userContent = att.originalName || message.content;

      if (originalAttachmentPath) {
        try {
          const targetDir = process.env.CLAUDE_ATTACHMENTS_DIR || path.join(CLAUDE_CWD, 'attachments');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetPath = path.join(targetDir, storedName);
          fs.copyFileSync(originalAttachmentPath, targetPath);
          
          // Claude에게는 작업 디렉토리 기준의 상대 경로 전달 (보안 통과 및 옵시디언 인식 용이)
          attachmentPath = path.relative(CLAUDE_CWD, targetPath);
          console.log(`[Claude Code Bridge] 첨부파일 복사 완료 (상대 경로: ${attachmentPath})`);
        } catch (copyErr) {
          console.error('[Claude Code Bridge] 첨부파일 복사 실패:', copyErr.message);
          attachmentPath = originalAttachmentPath; // 실패 시 fallback으로 절대 경로
        }
      } else {
        console.log('[Claude Code Bridge] 첨부파일 로컬 원본을 찾을 수 없습니다.');
      }
    }

    console.log(`[Claude Code Bridge] 처리 중: "${userContent.slice(0, 50)}"`);
    addHistory('user', userContent);
    const prompt = buildPrompt(userContent, attachmentPath);
    sendTyping(true); // "응답 작성 중" 표시 시작 (해제는 finally)

    try {
      const reply = await runClaudeCode(prompt);
      if (reply) {
        addHistory('assistant', reply);
        await sendMessage(reply);
      }
    } catch (e) {
      console.error('[Claude Code Bridge] 오류:', e.message);
      try { await sendMessage(`⚠️ Claude Code 오류: ${e.message}`); } catch (_) {}
    } finally {
      processing = false;
      sendTyping(false); // "응답 작성 중" 해제
    }
  });

  socket.on('new_thread_reply', async ({ roomId, messageId, reply }) => {
    // 디버그: 수신 데이터 확인
    console.log(`[Claude Code Bridge] 스레드 raw 데이터:`, JSON.stringify({ roomId, messageId, reply: { ...reply, content: reply?.content?.slice(0, 80) } }));
    
    // 봇 자신이 보낸 메시지 무시
    if (reply.isBot) return;

    // 동시 요청 방지
    if (processing) {
      try { await sendMessage('⏳ 이전 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.', messageId); } catch (_) {}
      return;
    }

    processing = true;

    console.log(`[Claude Code Bridge] 스레드 답글 처리 중: "${reply.content.slice(0, 50)}"`);
    addHistory('user', reply.content);
    const prompt = buildPrompt(reply.content, null);
    sendTyping(true, messageId); // "응답 작성 중" 표시 시작

    try {
      const botReply = await runClaudeCode(prompt);
      if (botReply) {
        addHistory('assistant', botReply);
        await sendMessage(botReply, messageId);
      }
    } catch (e) {
      console.error('[Claude Code Bridge] 스레드 오류:', e.message);
      try { await sendMessage(`⚠️ Claude Code 오류: ${e.message}`, messageId); } catch (_) {}
    } finally {
      processing = false;
      sendTyping(false, messageId); // "응답 작성 중" 해제
    }
  });

  return socket;
}

console.log(`[Claude Code Bridge] 시작됨. 서버: ${MYTOK_URL} | 작업 디렉터리: ${CLAUDE_CWD}`);
connect();
