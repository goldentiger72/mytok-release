// Bun은 .env를 자동 로딩하므로 dotenv 불필요

// 예상치 못한 에러로 서버가 종료되지 않도록 보호
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});


import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import helmet from 'helmet';

// DB 초기화 (앱 시작 시 테이블 생성)
import './config/db.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));

// Cloudflare Tunnel은 HTTPS → HTTP로 내부 전달하므로 proxy 신뢰 필요
app.set('trust proxy', 1);
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: false }
});

// uploads/ 디렉터리 자동 생성
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../uploads');
['images', 'files'].forEach(sub => {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 세션 스토어 (bun:sqlite)
import BunSqliteStore from './config/session-store.js';
const sessionMiddleware = session({
  store: new BunSqliteStore({ filename: path.join(__dirname, '../sessions.db') }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // trust proxy=1 설정으로, HTTPS 접속 시 Secure 쿠키가 자동 적용됨.
    // HTTP(Tailscale VPN) 접속도 허용하기 위해 false로 설정.
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Socket.io에 세션 공유 — 봇 토큰 인증 요청은 세션 불필요하므로 스킵
io.engine.use((req, res, next) => {
  // Socket.io handshake의 auth.botToken이 존재하면 세션 미들웨어 건너뛰기
  // (봇 브릿지는 쿠키/세션 없이 토큰으로만 인증)
  const isBotConnection = req._query?.botToken || req.headers?.['x-bot-token'];
  if (isBotConnection) return next();
  sessionMiddleware(req, res, next);
});

// 프론트엔드 정적 파일 서빙 (프로덕션)
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// 라우터 (T009에서 마운트)
app.set('io', io); // 라우터에서 io 접근 가능하도록

// Auth 라우터
import authRouter from './routes/auth.js';
app.use('/auth', authRouter);

// API 라우터
import roomsRouter from './routes/rooms.js';
import messagesRouter from './routes/messages.js';
import filesRouter from './routes/files.js';
import usersRouter from './routes/users.js';
app.use('/api/rooms', roomsRouter);
app.use('/api/rooms/:id/messages', messagesRouter);
app.use('/api/rooms', filesRouter);   // POST /api/rooms/:id/upload
app.use('/api/files', filesRouter);    // GET  /api/files/:storedName
app.use('/api/users', usersRouter);    // GET  /api/users

import botsRouter from './routes/bots.js';
app.use('/api/bots', botsRouter);      // GET/POST /api/bots, DELETE/POST /api/bots/:id
app.use('/bot', botsRouter);           // GET /bot/:token/getUpdates, POST /bot/:token/sendMessage

// Intelligence Layer (선택적) — ENABLE_INTELLIGENCE_LAYER=true 로 활성화
if (process.env.ENABLE_INTELLIGENCE_LAYER === 'true') {
  const { default: obsidianRouter } = await import('./routes/obsidian.js');
  const { default: wikiRouter } = await import('./routes/wiki.js');
  const { default: ontologyRouter } = await import('./routes/ontology.js');
  const { default: agentsRouter } = await import('./routes/agents.js');
  app.use('/api/obsidian', obsidianRouter);
  app.use('/api/wiki', wikiRouter);
  app.use('/api/ontology', ontologyRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/bot/:token', agentsRouter);
  console.log('[MyTok] Intelligence Layer 활성화됨');
}

// Socket.io 핸들러
import { registerHandlers } from './socket/handlers.js';
registerHandlers(io);

// 글로벌 에러 핸들러 (T034)
app.use((err, req, res, _next) => {
  // multer 파일 크기 초과
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'FILE_TOO_LARGE', message: '파일 크기가 제한을 초과했습니다.' });
  }
  console.error('[HTTP ERROR]', err.status || 500, err.message, err.stack?.split('\n')[1] || '');
  res.status(err.status || 500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' });
});

// 미처리 Socket 에러 로깅 (T034)
io.on('error', (err) => console.error('[SOCKET ERROR]', err.message));


const PORT = parseInt(process.env.PORT || '3500', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
httpServer.on('error', (err) => {
  console.error('[SERVER LISTEN ERROR]', err.code, err.message, err.stack);
  process.exit(1);
});
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`MyTok server running → ${BASE_URL}`);
});

export { app, io };
