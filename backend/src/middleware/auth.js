/**
 * requireAuth — 인증되지 않은 요청을 401로 거부
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' });
}

/**
 * requireOwner — is_owner=0인 사용자를 403으로 거부
 * requireAuth와 함께 사용해야 함
 */
function requireOwner(req, res, next) {
  if (req.user && req.user.is_owner) {
    return next();
  }
  res.status(403).json({ error: 'FORBIDDEN', message: '소유자만 사용할 수 있는 기능입니다.' });
}

export { requireAuth, requireOwner };

