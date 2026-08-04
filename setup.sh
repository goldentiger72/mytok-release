#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# MyTok 초기 설정 스크립트 (Linux / macOS)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       💬 MyTok 초기 설정 시작       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Bun 버전 확인 ──
BUN_VERSION=$(bun --version 2>/dev/null || echo "none")
if [[ "$BUN_VERSION" == "none" ]]; then
  echo "❌ Bun이 설치되어 있지 않습니다."
  echo "   https://bun.sh 에서 Bun을 설치해 주세요."
  echo "   curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo "✅ Bun $BUN_VERSION 감지됨"

# ── Backend .env 생성 ──
if [[ -f "$BACKEND_DIR/.env" ]]; then
  echo "ℹ️  backend/.env 이미 존재 — 건너뜁니다"
else
  echo "📝 backend/.env 생성 중..."
  SESSION_SECRET=$(bun -e "const crypto = await import('crypto'); console.log(crypto.randomBytes(32).toString('hex'))")
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  # SESSION_SECRET 자동 설정
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/^SESSION_SECRET=$/SESSION_SECRET=$SESSION_SECRET/" "$BACKEND_DIR/.env"
  else
    sed -i "s/^SESSION_SECRET=$/SESSION_SECRET=$SESSION_SECRET/" "$BACKEND_DIR/.env"
  fi
  echo "✅ backend/.env 생성 완료 (SESSION_SECRET 자동 생성됨)"
  echo ""
  echo "   ⚠️  다음 값을 직접 설정해 주세요:"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - GOOGLE_CLIENT_SECRET"
  echo "   - ALLOWED_EMAILS"
  echo "   - OWNER_EMAIL"
  echo "   - BASE_URL"
  echo ""
fi

# ── bun install ──
echo "📦 Backend 의존성 설치 중..."
(cd "$BACKEND_DIR" && bun install)
echo "✅ Backend 설치 완료"

echo "📦 Frontend 의존성 설치 중..."
(cd "$FRONTEND_DIR" && bun install)
echo "✅ Frontend 설치 완료"

# ── Frontend 빌드 ──
echo "🔨 Frontend 빌드 중..."
(cd "$FRONTEND_DIR" && bun run build)
echo "✅ Frontend 빌드 완료"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       ✅ 초기 설정 완료!            ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "다음 단계:"
echo "  1. backend/.env 파일의 필수 값을 설정하세요"
echo "  2. Google OAuth 콜백 URI를 설정하세요"
echo "     → {BASE_URL}/auth/google/callback"
echo "  3. 서버 실행: cd backend && bun src/server.js"
echo ""
