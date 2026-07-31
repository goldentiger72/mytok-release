#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# MyTok 설치 스크립트 (macOS / Linux)
#
# 사용법:
#   chmod +x setup.sh && ./setup.sh
# ──────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "🐯 MyTok 설치를 시작합니다..."
echo "──────────────────────────────────"

# ── 1. Bun 확인 ─────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "❌ Bun이 설치되어 있지 않습니다."
  echo "   설치: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo "✅ Bun $(bun --version) 감지"

# ── 2. 의존성 설치 ──────────────────────────────────────────
echo ""
echo "📦 Backend 의존성 설치..."
cd "$SCRIPT_DIR/backend" && bun install

echo "📦 Bridges 의존성 설치..."
cd "$SCRIPT_DIR/bridges" && bun install

# ── 3. 환경변수 설정 ────────────────────────────────────────
cd "$SCRIPT_DIR"

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo ""
  echo "⚙️  backend/.env 파일이 생성되었습니다."
  echo "   아래 항목을 반드시 설정해주세요:"
  echo ""
  echo "   1. GOOGLE_CLIENT_ID      — Google OAuth 클라이언트 ID"
  echo "   2. GOOGLE_CLIENT_SECRET  — Google OAuth 클라이언트 시크릿"
  echo "   3. SESSION_SECRET        — 세션 암호화 키 (아래 명령으로 생성)"
  echo "      bun -e \"const crypto = await import('crypto'); console.log(crypto.randomBytes(32).toString('hex'))\""
  echo "   4. ALLOWED_EMAILS        — 접근 허용 이메일 (쉼표 구분)"
  echo "   5. OWNER_EMAIL           — 관리자 이메일"
  echo "   6. BASE_URL              — 외부 접근 URL"
  echo ""
  NEEDS_CONFIG=true
else
  echo "✅ backend/.env 이미 존재 — 건너뜁니다"
  NEEDS_CONFIG=false
fi

# ── 4. 완료 ─────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────"
echo "🎉 MyTok 설치 완료!"
echo ""
echo "📋 다음 단계:"

if [ "$NEEDS_CONFIG" = true ]; then
  echo "   1. backend/.env 파일을 편집하세요"
  echo "   2. ./start-mytok.sh 로 서버를 시작하세요"
else
  echo "   ./start-mytok.sh 로 서버를 시작하세요"
fi

echo ""
echo "🌐 Tailscale 사용 시:"
echo "   서버와 클라이언트 모두 Tailscale에 연결되어 있어야 합니다."
echo "   https://tailscale.com/download"
echo ""
