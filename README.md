# 🐯 MyTok — Privacy-First Self-Hosted Messenger

> 모든 대화는 오직 내 서버에만 저장됩니다. 제3자 서버 저장 없음.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/runtime-Bun-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue)

## 🔑 핵심 특징

- **🔒 프라이버시 우선**: 메시지·파일 모두 소유자 서버에만 저장
- **🌐 Tailscale VPN**: 공개 포트 없이 암호화된 사설 네트워크
- **📱 PWA 지원**: 모바일/데스크톱 앱처럼 설치 가능
- **🤖 AI 봇 지원**: Hermes, Claude Code, OpenClaw 등 AI 에이전트 연동 → [📖 **원격 AI 에이전트 연동 가이드**](docs/multi-device-agent-guide.md)
- **🎨 테마 커스터마이징**: 골드/오션/로즈 3가지 디자인 테마
- **♿ 접근성**: 글자 크기 4단계, 고대비 모드

## 📋 필수 요구사항

- **[Bun](https://bun.sh)** v1.0 이상
- **[Tailscale](https://tailscale.com)** (권장) 또는 Cloudflare Tunnel → [📖 **Tailscale 설치 가이드**](docs/tailscale-setup-guide.md)
- **Google OAuth** 클라이언트 ID/Secret → [📖 **OAuth 설정 가이드**](docs/oauth-setup-guide.md)

## 🚀 설치 방법

### 1. 레포지토리 클론

```bash
git clone https://github.com/goldentiger72/mytok-release.git
cd mytok-release
```

### 2. 설치 스크립트 실행

```bash
chmod +x setup.sh start-mytok.sh
./setup.sh
```

### 3. 환경변수 설정

`backend/.env` 파일을 열어 아래 항목을 설정합니다:

```env
# Google OAuth 2.0 (필수)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# 세션 암호화 키 (아래 명령으로 생성)
# bun -e "const crypto = await import('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"
SESSION_SECRET=your-random-secret

# 접근 허용 이메일 (쉼표 구분)
ALLOWED_EMAILS=you@gmail.com,friend@gmail.com

# 관리자 이메일
OWNER_EMAIL=you@gmail.com

# 외부 접근 URL
BASE_URL=https://your-machine.tail12345.ts.net:3500
```

### 4. Google OAuth 리디렉션 URI 등록

[Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트를 열고,
**승인된 리디렉션 URI**에 접속할 모든 도메인의 콜백 URL을 등록합니다:

```
http://localhost:3500/auth/google/callback
https://your-domain.example.com/auth/google/callback
```

> **주의**: 이 설정이 누락되면 모바일 등 외부 접속 시 `400 redirect_uri_mismatch` 오류가 발생합니다.
> localhost와 외부 도메인 모두 등록해야 합니다.

### 5. 서버 시작

```bash
./start-mytok.sh
```

옵션:
- `./start-mytok.sh --tailscale` — Tailscale 전용
- `./start-mytok.sh --cloudflare` — Cloudflare 터널
- `./start-mytok.sh --local` — 로컬 개발용

### 6. 접속

브라우저에서 `BASE_URL`로 접속합니다.
PWA 설치: 브라우저 주소창의 "설치" 아이콘 클릭.

## 📁 프로젝트 구조

```
mytok-release/
├── backend/              # Node.js + Express + Socket.io 서버
│   ├── src/              # 서버 소스 코드
│   ├── package.json
│   └── .env.example      # 환경변수 템플릿
├── frontend/
│   └── dist/             # 빌드된 PWA 정적 파일
├── bridges/              # AI 봇 브릿지 (선택)
│   ├── bridge-hermes.js
│   ├── bridge-claude-code.js
│   └── bridge-openclaw.js
├── setup.sh              # 설치 스크립트
├── start-mytok.sh        # 시작 스크립트 (macOS/Linux)
├── start-mytok.bat       # 시작 스크립트 (Windows)
└── package.json
```

## 🌐 Cloudflare Tunnel 설정 (선택)

외부 도메인으로 접속하려면 Cloudflare Tunnel을 설정합니다.

```bash
# 1. cloudflared 설치 (macOS)
brew install cloudflared

# 2. Cloudflare 로그인
cloudflared login

# 3. 터널 생성
cloudflared tunnel create mytok-mini
# 출력되는 터널 ID와 credentials 경로를 기록합니다

# 4. DNS 라우트 등록
cloudflared tunnel route dns <터널이름> your-domain.example.com

# 5. 설정 파일 생성
cat > ~/.cloudflared/mytok-config.yml << EOF
tunnel: <터널이름>
credentials-file: /Users/<username>/.cloudflared/<터널ID>.json

ingress:
  - hostname: your-domain.example.com
    service: http://localhost:3500
  - service: http_status:404
EOF

# 6. backend/.env의 BASE_URL을 도메인으로 설정
# BASE_URL=https://your-domain.example.com

# 7. Cloudflare 모드로 서버 시작
./start-mytok.sh --cloudflare
```

> **주의**: Google OAuth 리디렉션 URI에 `https://your-domain.example.com/auth/google/callback`을 반드시 추가하세요. (4단계 참조)

## 🔧 AI 봇 연동 (선택)

`bridges/` 디렉토리에 AI 봇 브릿지가 포함되어 있습니다.
상세 설정은 [bridges/README.md](bridges/README.md) 참조.

## 🛡️ 보안

- 모든 통신은 Tailscale/Cloudflare 암호화 터널을 통해 이루어집니다
- Google OAuth로 인증된 사용자만 접근 가능합니다
- 이메일 허용 목록으로 접근을 제한합니다
- SQLite 파일 권한: `chmod 600`

## 📄 라이선스

[MIT License](LICENSE)

---

Made with 🐯 by [goldentiger72](https://github.com/goldentiger72)
