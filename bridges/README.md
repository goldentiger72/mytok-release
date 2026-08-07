# MyTok AI Bridge Scripts

MyTok 채팅방과 AI를 연결하는 Bridge 스크립트 모음입니다.  
각 스크립트는 **독립 프로세스**로 실행되며, MyTok 서버와는 Bot API(HTTP 폴링)로 통신합니다.

---

## 사전 준비

### 1. 봇 토큰 발급

MyTok에 소유자 계정으로 로그인 → 채팅방 목록 하단 **🤖 봇 관리** → 봇 생성  
발급된 토큰을 복사해 아래 `.env` 파일에 붙여넣으세요.

### 2. 환경변수 파일 생성

* **macOS / Linux**:
  ```bash
  cp .env.example .env
  # .env 파일을 편집하여 BOT_TOKEN 등 값 입력
  ```
* **Windows (PowerShell)**:
  ```powershell
  Copy-Item .env.example .env
  # .env 파일을 편집하여 BOT_TOKEN 등 값 입력
  ```

### 3. 의존성 설치 (Claude Bridge만 해당)

```bash
bun install
```

---

## Bridge 실행 방법

### Hermes Bridge (Hermes Agent API)

**사전 조건**: [Hermes](https://github.com/hermes-agent/hermes) 설치 및 Gateway 실행 중

#### 1. Hermes API 서버 활성화

Hermes Gateway의 내장 API 서버(OpenAI 호환)를 활성화해야 합니다.

```bash
# API 서버 키 생성
openssl rand -hex 24
# 출력 예: e68c44f5dfce0a6eaa13cb3445b3f6689d189457d6e803c0
```

`~/.hermes/config.yaml`에서 `api_server` 섹션에 `enabled`와 `port`를 추가합니다:

```yaml
  api_server:
    enabled: true
    port: 8642
    max_concurrent_runs: 10
```

`~/.hermes/.env`에 API 서버 키를 추가합니다:

```env
API_SERVER_KEY=<위에서 생성한 키>
```

> **주의**: `API_SERVER_KEY`가 없으면 API 서버가 시작을 거부합니다.
> `config.yaml`에 `enabled: true`와 `port`가 모두 있어야 합니다.

#### 2. Gateway 재시작

```bash
hermes gateway stop && hermes gateway start
```

API 서버 동작 확인:

```bash
curl -H "Authorization: Bearer <API_SERVER_KEY>" http://localhost:8642/v1/models
```

#### 3. bridges/.env 설정

```env
HERMES_URL=http://localhost:8642
HERMES_MODEL=hermes-agent
HERMES_API_KEY=<API_SERVER_KEY와 동일한 값>
```

#### 4. Bridge 실행

```bash
bun bridge-hermes.js
# 출력: [Hermes Bridge] Hermes API 연결됨 — 모델: hermes-agent
```

> **참고**: Gateway 시작 직후에는 API 서버 준비에 수 초가 걸릴 수 있습니다.
> `Hermes API 연결 실패` 메시지가 나오면 잠시 후 재실행하세요.

> **참고**: 종량제 Anthropic API 방식(`bridge-claude.js`)은 헌법 Principle VI
> (Cost-Safe AI Backends, v1.1.0)에 따라 **제거되었습니다**. Claude를 쓰려면 아래
> **Claude Code Bridge**(claude.ai 구독)를 사용하세요.

### Claude Code Bridge

**사전 조건**: Claude Code CLI 설치

```bash
# Claude Code 설치: https://docs.anthropic.com/claude-code
bun install -g @anthropic-ai/claude-code  # 또는 npm install -g @anthropic-ai/claude-code

# Bridge 실행
bun bridge-claude-code.js
# 또는: node bridge-claude-code.js
# 출력: [Claude Code Bridge] 시작됨.
```

---

## 백그라운드 실행 (선택사항 — PM2 사용)

```bash
bun install -g pm2 # 또는 npm install -g pm2

pm2 start bridge-hermes.js --name hermes-bridge
pm2 start bridge-claude-code.js --name claude-code-bridge

pm2 list        # 상태 확인
pm2 logs hermes-bridge  # 로그 확인
pm2 save        # 재부팅 후 자동 시작 저장
```

---

## 주의 사항

- `.env` 파일은 절대 공유하지 마세요 (BOT_TOKEN, API Key 포함).
- Claude Bridge 사용 시 채팅 메시지가 Anthropic 서버로 전송됩니다.
- Hermes Bridge는 완전 로컬 — 외부 서버 전송 없음.
- 봇 토큰이 유출되면 MyTok UI에서 즉시 재발급하세요.

---

## Hermes Desktop 앱 플러그인 (고급 연동)

`bridges/hermes-plugin/`은 Hermes Desktop 앱(윈도우)에서 직접 로드되는 **Python 플러그인**입니다.  
Bridge 스크립트(HTTP 폴링) 대신 **Socket.io 직접 연결** 방식으로 더 빠른 응답을 제공합니다.

### 설치 방법 (Windows 기준)

> [!NOTE]  
> Hermes Desktop 플러그인은 현재 Windows 데스크톱 환경만 정식 지원합니다.

```powershell
# 1. Hermes 사용자 플러그인 경로에 복사
$hermesPlugins = "$env:LOCALAPPDATA\hermes\plugins"
Copy-Item -Recurse "bridges\hermes-plugin" "$hermesPlugins\mytok" -Force

# 2. 환경 변수 설정 (Hermes .env)
$hermesEnv = "$env:LOCALAPPDATA\hermes\.env"
Add-Content $hermesEnv "MYTOK_BOT_TOKEN=<봇_토큰>"
Add-Content $hermesEnv "MYTOK_URL=http://localhost:3500"
Add-Content $hermesEnv "MYTOK_ALLOW_ALL_USERS=true"
```

### 활성화 및 실행 (Windows 기준)

```powershell
# 플러그인 활성화 (최초 1회)
hermes plugins enable mytok-platform

# Gateway 시작 (터미널에서 실행하면 로그 실시간 확인 가능)
hermes gateway
```

### Bridge vs 플러그인 비교

| 항목 | Bridge 스크립트 | Hermes 플러그인 |
|------|----------------|----------------|
| 연결 방식 | HTTP 폴링 (1초 간격) | Socket.io 실시간 |
| 응답 속도 | ~1초 지연 | 즉시 |
| AI 모델 | Hermes Agent API / Anthropic | Hermes Agent 전체 기능 |
| 설치 복잡도 | Node.js만 필요 | Hermes Desktop 앱 필요 |
| 플랫폼 | 모든 OS | Windows (Hermes Desktop) |
