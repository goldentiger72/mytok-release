import db from '../config/db.js';

/**
 * 봇 명령어 핸들러
 * send_message 이벤트 후 방에 봇이 있으면 자동 호출
 */

// KST 현재 시각 문자열
function nowKST() {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

// 명령어 → 응답 함수 맵
const COMMANDS = {
  '/도움말': () =>
    `🤖 **MyTok 봇 명령어**\n\n` +
    `\`/도움말\` — 이 메시지\n` +
    `\`/시간\` — 현재 한국 시각\n` +
    `\`/에코 <텍스트>\` — 입력한 텍스트 반복\n` +
    `\`/핑\` — 봇 응답 확인\n` +
    `\`/멤버\` — 채팅방 구성원 목록`,

  '/help': () =>
    `🤖 **MyTok Bot Commands**\n\n` +
    `\`/도움말\` or \`/help\` — Show this message\n` +
    `\`/시간\` — Current KST time\n` +
    `\`/에코 <text>\` — Echo your text\n` +
    `\`/핑\` — Check bot response\n` +
    `\`/멤버\` — List room members`,

  '/시간': () => `🕐 현재 시각 (KST)\n**${nowKST()}**`,

  '/핑': () => '🏓 퐁! (봇이 정상 동작 중입니다)',
  '/ping': () => '🏓 Pong!',
};

/**
 * 메시지를 분석하고 봇 응답을 생성
 * @returns {string|null} 응답 문자열 (없으면 null)
 */
function processMessage(content, roomId, members) {
  const text = (content || '').trim();

  // /에코 처리
  if (text.startsWith('/에코 ') || text.startsWith('/echo ')) {
    const after = text.substring(text.indexOf(' ') + 1);
    return `🔁 ${after}`;
  }

  // /멤버 처리
  if (text === '/멤버' || text === '/members') {
    const lines = members
      .filter(m => !m.is_bot)
      .map(m => `• ${m.display_name}`)
      .join('\n');
    return `👥 **구성원 목록**\n${lines || '(없음)'}`;
  }

  // 정적 명령어 맵 처리
  const handler = COMMANDS[text];
  if (handler) return handler();

  // 알 수 없는 /명령어 처리
  if (text.startsWith('/')) {
    return `❓ 알 수 없는 명령어입니다.\n\`/도움말\` 로 명령어 목록을 확인하세요.`;
  }

  return null; // 일반 메시지 — 봇 응답 없음
}

/**
 * 봇 응답을 DB에 저장하고 Socket으로 브로드캐스트
 */
function triggerBot(io, roomId, userMessage) {
  // 봇 사용자 조회
  const bot = db.prepare("SELECT * FROM users WHERE is_bot = 1 AND email = 'bot@mytok.local'").get();
  if (!bot) return;

  // 봇이 해당 방의 구성원인지 확인
  const botMember = db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, bot.id);
  if (!botMember) return;

  // 방 구성원 목록 (멤버 명령어용)
  const members = db.prepare(`
    SELECT u.id, u.display_name, u.is_bot
    FROM users u INNER JOIN room_members rm ON rm.user_id = u.id
    WHERE rm.room_id = ?
  `).all(roomId);

  // 봇 응답 생성
  const response = processMessage(userMessage, roomId, members);
  if (!response) return;

  // 100ms 딜레이 (자연스러운 응답 느낌)
  setTimeout(() => {
    try {
      const inserted = db.prepare(
        'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?) RETURNING id'
      ).get(roomId, bot.id, response);

      const message = {
        id: inserted.id,
        roomId,
        senderId: bot.id,
        senderName: bot.display_name,
        senderAvatar: null,
        content: response,
        sentAt: new Date().toISOString(),
        readStatus: null,
        attachment: null
      };

      io.to(`room:${roomId}`).emit('new_message', { message });
    } catch (err) {
      console.error('[BOT ERROR]', err.message);
    }
  }, 150);
}

export { triggerBot };
