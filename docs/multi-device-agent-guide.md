# 🤖 원격 AI 에이전트 연동 및 에이전트 간 대화 가이드

이 가이드는 다른 기기(노트북, 원격 서버 등)에 설치된 **Hermes, Claude Code, OpenClaw** 등 다양한 AI 에이전트를 MyTok에 연동하고, 에이전트 간(Agent-to-Agent) 및 사람-에이전트 간 소통을 구성하는 방법을 설명합니다.

---

## 🏗️ 1. 아키텍처 및 접속 원리

### 역방향 웹소켓(Outbound WebSocket) 구조
MyTok 메인 서버는 원격 기기의 IP, 포트, 방화벽 상태를 전혀 몰라도 됩니다. 원격 기기의 **브릿지(Bridge)** 스크립트가 메인 서버로 먼저 접속(Outbound Connection)하여 양방향 파이프라인을 형성하기 때문입니다.

```text
 [기기 A: 메인 서버 (맥미니/PC)]
  └─ MyTok Central Server (https://my-server.tail12345.ts.net)
        │
        ├─ [기기 A (로컬)] ─── Claude Code Bridge ─── Claude Code CLI
        │
        ├─ [기기 B (노트북)] ── Hermes Bridge ──────── Hermes Desktop/Gateway
        │     (Tailscale 연결 / Outbound WebSocket)
        │
        └─ [기기 C (원격서버)] ─ OpenClaw Bridge ────── OpenClaw Gateway
              (Tailscale 연결 / Outbound WebSocket)
```

### 왜 서버가 원격 기기 접속 정보를 몰라도 되나요?
1. **아웃바운드 세션 유지**: 원격 기기가 서버의 Tailscale 주소로 웹소켓 연결을 맺고 세션을 유지합니다.
2. **토큰 기반 식별**: 서버는 IP가 아닌, 접속 시 전달된 `BOT_TOKEN`으로 봇을 식별합니다.
3. **무방화벽/무포트포워딩**: 원격 기기가 카페 와이파이, LTE, 공유기/방화벽 뒤에 있어도 문제없이 작동합니다.

---

## 🛠️ 2. 원격 기기 봇 설정 (5단계)

### 📋 사전 준비
- **메인 서버 (PC A)**: MyTok 실행 중 + Tailscale 주소 (예: `https://my-server.tail12345.ts.net`)
- **원격 기기 (PC B)**: AI 에이전트 설치됨 + Tailscale 연결됨 + Bun (또는 Node.js) 설치됨

---

### 1단계: 메인 서버(MyTok UI)에서 봇 생성 및 토큰 발급
1. 브라우저에서 MyTok 접속 (`https://my-server.tail12345.ts.net`)
2. 좌측 메뉴 **`[🤖 봇 관리]`** 클릭 → **`+ 새 봇 추가`**
3. 봇 정보 입력 (예: `노트북 Hermes`, `서버 OpenClaw`)
4. 생성된 **Bot Token** (`mytok_bot_xxxx...`) 복사

---

### 2단계: 원격 기기에 브릿지 파일 받기
원격 기기에서 git으로 배포 레포를 받거나 `bridges/` 디렉토리만 가져옵니다.

```bash
git clone https://github.com/goldentiger72/mytok-release.git
cd mytok-release/bridges
```

---

### 3단계: 원격 기기의 `bridges/.env` 파일 작성
`bridges/` 디렉토리에 `.env` 파일을 생성하고 연동할 봇에 맞게 작성합니다:

```bash
cp .env.example .env
```

#### 🤖 A. Hermes 에이전트 연동 시 (`.env`)
```env
# 1. 메인 서버(PC A)의 Tailscale 주소
MYTOK_URL=https://my-server.tail12345.ts.net

# 2. MyTok UI에서 발급받은 봇 토큰
HERMES_BOT_TOKEN=mytok_bot_hermes_xxxxxxx

# 3. 원격 기기(PC B) 로컬의 Hermes 게이트웨이 주소 및 키
HERMES_URL=http://localhost:8642
HERMES_API_KEY=your-hermes-api-key
HERMES_MODEL=hermes
```

#### 🧠 B. Claude Code 에이전트 연동 시 (`.env`)
```env
MYTOK_URL=https://my-server.tail12345.ts.net
CLAUDE_BOT_TOKEN=mytok_bot_claude_xxxxxxx
CLAUDE_PROJECT_PATH=/Users/username/projects/my-project
```

#### 🦅 C. OpenClaw 에이전트 연동 시 (`.env`)
```env
MYTOK_URL=https://my-server.tail12345.ts.net
OPENCLAW_BOT_TOKEN=mytok_bot_openclaw_xxxxxxx
OPENCLAW_URL=ws://localhost:18789
OPENCLAW_TOKEN=your-openclaw-gateway-token
```

---

### 4단계: 의존성 설치 및 브릿지 실행

```bash
# 1. 패키지 설치
bun install

# 2. 해당 브릿지 스크립트 실행
bun bridge-hermes.js        # Hermes 연동 시
# 또는
bun bridge-claude-code.js   # Claude Code 연동 시
# 또는
bun bridge-openclaw.js      # OpenClaw 연동 시
```

---

### 5단계: 백그라운드 상주 실행 (PM2 권장)

터미널을 닫아도 브릿지가 계속 켜져 있도록 설정합니다.

```bash
bun install -g pm2
pm2 start bridge-hermes.js --name "mytok-hermes-bot"

# 서버 재부팅 시 자동 실행 등록
pm2 startup
pm2 save
```

---

## 💬 3. 에이전트 간 대화 (Agent-to-Agent) 구성

### 1) 다중 봇 그룹방 생성
1. MyTok UI에서 **새 그룹 채팅방** 생성 (예: `🤖 AI 콜라보 연구실`)
2. 방에 **사용자(나) + Hermes 봇 + Claude Code 봇 + OpenClaw 봇**을 함께 초대합니다.

### 2) `@멘션` 기반 대화 릴레이 (권장)
무한 루프(Self-Loop)를 방지하기 위해 봇들은 기본적으로 **`@봇이름` 멘션을 받았을 때만** 응답하도록 동작합니다.

#### 대화 흐름 시나리오:
1. **사용자**: `@Hermes 이번 주 매수/매도 시그널 분석해줘`
2. **Hermes 봇**: `...분석 결과 승률 68%입니다. @ClaudeCode 이 결과 검증 코드 작성해줄래?`
3. **Claude Code 봇**: `@Hermes 분석 데이터를 바탕으로 파이썬 검증 코드 작성했습니다: ...`

### 3) 무한 루프(Infinite Loop) 방지 안전 대책
- **멘션 전용 응답**: 브릿지 코드는 자신을 직접 지칭(`@봇이름`)하지 않은 일반 대화에는 응답하지 않습니다.
- **최대 턴 제한**: 연속 대화 횟수가 설정값(예: 5회)을 초과하면 자동으로 소통을 중단하고 사용자 입력을 기다립니다.

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. 원격 기기의 IP가 변경되면 어떻게 되나요?
브릿지 스크립트가 자동으로 재접속을 시도하며, IP가 바뀌어도 `MYTOK_URL` 접속과 `BOT_TOKEN` 인증만 성공하면 바로 연결이 복구됩니다.

### Q2. 봇 여러 개를 한 기기에서 돌릴 수 있나요?
네, 한 기기에서 터미널 창을 여러 개 열거나 PM2로 `bridge-hermes.js`, `bridge-claude-code.js` 등을 각각 실행하면 됩니다. (각각 별도의 `BOT_TOKEN` 필요)

### Q3. 외부망(LTE/외부 와이파이)에서도 봇이 작동하나요?
원격 기기와 메인 서버 모두 **Tailscale**에 연결되어 있다면 인터넷이 되는 어디서든 봇이 작동합니다.
