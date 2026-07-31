#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# MyTok 일괄 기동 스크립트 (macOS / Linux)
#
# 사용법:
#   ./start-mytok.sh              # 자동 감지 (Cloudflare/Tailscale 설정을 파악하여 알맞게 구동)
#   ./start-mytok.sh --cloudflare # Cloudflare 터널 강제 구동
#   ./start-mytok.sh --tailscale  # Tailscale 전용 강제 구동
#   ./start-mytok.sh --local      # 로컬 전용 강제 구동
# ──────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARG_MODE="${1:-auto}"

# macOS Tailscale CLI 자동 탐색 헬퍼
_tailscale() {
  if command -v tailscale &>/dev/null; then
    tailscale "$@"
  elif [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]; then
    /Applications/Tailscale.app/Contents/MacOS/Tailscale "$@"
  else
    return 1
  fi
}

# ── 1. 시스템 환경 자동 감지 ─────────────────────────────────
HAS_CLOUDFLARE=false
HAS_TAILSCALE=false

# Cloudflare 터널 커맨드 및 설정 파일 확인
if command -v cloudflared &>/dev/null && [ -f ~/.cloudflared/mytok-config.yml ]; then
  HAS_CLOUDFLARE=true
fi

# Tailscale IP 감지 가능 여부 확인
TS_IP=$(_tailscale ip -4 2>/dev/null)
if [ -n "$TS_IP" ]; then
  HAS_TAILSCALE=true
fi

# ── 2. 구동 모드 최종 결정 ──────────────────────────────────
MODE=""
if [ "$ARG_MODE" = "auto" ]; then
  if $HAS_CLOUDFLARE && $HAS_TAILSCALE; then
    MODE="both"
  elif $HAS_CLOUDFLARE; then
    MODE="cloudflare"
  elif $HAS_TAILSCALE; then
    MODE="tailscale"
  else
    MODE="local"
  fi
else
  # 인자 강제화 적용
  case "$ARG_MODE" in
    --tailscale|-t)    MODE="tailscale" ;;
    --local|-l)        MODE="local" ;;
    --cloudflare|-c)   MODE="cloudflare" ;;
    *)                 MODE="local" ;;
  esac
fi

echo "[MyTok] 기존 프로세스 정리 중..."
pkill -f "bun src/server.js" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# ── 3. 네트워크 모드별 구동 ──────────────────────────────────
case "$MODE" in
  both)
    echo "[MyTok] 감지 결과: Cloudflare 터널 + Tailscale 모두 사용 가능"
    cloudflared tunnel --config ~/.cloudflared/mytok-config.yml run >/dev/null 2>&1 &
    sleep 2
    echo "[MyTok] Cloudflare 터널 백그라운드 구동 완료."
    echo "[MyTok] 🌐 외부 도메인 접속: https://mytok.aiup.co.kr"
    echo "[MyTok] 🔒 Tailscale VPN 접속: http://$TS_IP:3500"
    TS_HOSTNAME=$(_tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\.$//')
    if [ -n "$TS_HOSTNAME" ]; then
      echo "[MyTok] 🔒 Tailscale MagicDNS 접속: http://$TS_HOSTNAME:3500"
    fi
    ;;

  cloudflare)
    echo "[MyTok] 감지 결과/강제: Cloudflare 터널 구동"
    cloudflared tunnel --config ~/.cloudflared/mytok-config.yml run >/dev/null 2>&1 &
    sleep 2
    echo "[MyTok] Cloudflare 터널 백그라운드 구동 완료."
    echo "[MyTok] 🌐 외부 도메인 접속: https://mytok.aiup.co.kr"
    ;;

  tailscale)
    echo "[MyTok] 감지 결과/강제: Tailscale VPN 전용 구동"
    if [ -n "$TS_IP" ]; then
      echo "[MyTok] 🔒 Tailscale VPN 접속: http://$TS_IP:3500"
      TS_HOSTNAME=$(_tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\.$//')
      if [ -n "$TS_HOSTNAME" ]; then
        echo "[MyTok] 🔒 Tailscale MagicDNS 접속: http://$TS_HOSTNAME:3500"
      fi
    else
      echo "[MyTok] ⚠️ Tailscale IP가 감지되지 않았습니다. 로컬 주소로 접속하세요."
      echo "[MyTok] 💻 로컬 접속: http://localhost:3500"
    fi
    ;;

  local)
    echo "[MyTok] 감지 결과/강제: 로컬 전용 구동"
    echo "[MyTok] 💻 로컬 접속: http://localhost:3500"
    ;;
esac

# ── 4. Bun 백엔드 서버 기동 ──────────────────────────────────
echo "[MyTok] Bun 백엔드 서버 기동 중..."
cd "$SCRIPT_DIR/backend"
bun src/server.js
