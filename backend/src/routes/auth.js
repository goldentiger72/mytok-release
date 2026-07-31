import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 허용 이메일 목록 (쉼표 구분, 소문자 정규화)
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim().toLowerCase();

// Google OAuth 전략 설정
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3500').replace(/\/$/, '');

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/auth/google/callback`,
    proxy: true  // X-Forwarded 헤더 신뢰 (리버스 프록시 대응)
  },
  function verify(accessToken, refreshToken, profile, done) {
    const email = (profile.emails?.[0]?.value || '').toLowerCase();

    // 허용 목록 검증
    if (!ALLOWED_EMAILS.includes(email)) {
      return done(null, false, { message: 'ACCESS_DENIED' });
    }

    const isOwner = email === OWNER_EMAIL ? 1 : 0;
    const displayName = profile.displayName || email;
    const avatarUrl = profile.photos?.[0]?.value || null;
    const googleId = profile.id;

    // Upsert user
    const upsert = db.prepare(`
      INSERT INTO users (google_id, email, display_name, avatar_url, is_owner)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(google_id) DO UPDATE SET
        display_name = ?,
        avatar_url   = ?,
        is_owner     = ?
    `);
    upsert.run(googleId, email, displayName, avatarUrl, isOwner, displayName, avatarUrl, isOwner);

    const user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  done(null, user || false);
});

// 라우트

// 요청 origin에서 동적 callbackURL 생성
function getCallbackURL(req) {
  const proto = req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/auth/google/callback`;
}

// GET /auth/google — OAuth 시작 (접속 origin 기반 동적 콜백)
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: true,
    callbackURL: getCallbackURL(req)
  })(req, res, next);
});

// GET /auth/google/callback — OAuth 콜백 (동적 callbackURL 매칭)
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: '/auth/denied',
    callbackURL: getCallbackURL(req)
  })(req, res, (err) => {
    if (err) return next(err);
    // last_seen_at 업데이트
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.user.id);
    res.redirect('/');
  });
});

// GET /auth/denied — 접근 거부 페이지로 리다이렉트
router.get('/denied', (req, res) => {
  res.redirect('/#/denied');
});

// POST /auth/logout
router.post('/logout', requireAuth, (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.json({ message: '로그아웃되었습니다.' });
    });
  });
});

// GET /auth/me — 현재 사용자 정보
router.get('/me', requireAuth, (req, res) => {
  const { id, email, display_name, avatar_url, is_owner } = req.user;
  res.json({
    id,
    email,
    displayName: display_name,
    avatarUrl: avatar_url,
    isOwner: Boolean(is_owner)
  });
});

// PUT /auth/me — 사용자 닉네임 및 프로필 이미지 수정
router.put('/me', requireAuth, (req, res) => {
  const { displayName, avatarUrl } = req.body;
  const userId = req.user.id;

  try {
    // 1. SQLite DB 업데이트
    db.prepare('UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?')
      .run(displayName || '황금호랑이', avatarUrl || '', userId);

    // 2. 세션 내 사용자 객체 갱신
    req.user.display_name = displayName || '황금호랑이';
    req.user.avatar_url = avatarUrl || '';

    res.json({
      success: true,
      user: {
        id: userId,
        email: req.user.email,
        displayName: req.user.display_name,
        avatarUrl: req.user.avatar_url,
        isOwner: Boolean(req.user.is_owner)
      }
    });
  } catch (err) {
    console.error('사용자 프로필 갱신 실패:', err);
    res.status(500).json({ error: '서버 오류로 인해 업데이트할 수 없습니다.' });
  }
});

export default router;
