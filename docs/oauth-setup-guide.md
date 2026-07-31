# 🔐 Google OAuth 2.0 설정 가이드

MyTok은 Google OAuth 2.0으로 사용자를 인증합니다.  
이 가이드는 Google Cloud Console에서 OAuth 클라이언트를 생성하고 MyTok에 연동하는 과정을 안내합니다.

---

## 📋 사전 준비

- Google 계정 (Gmail)
- MyTok 서버의 접속 URL (예: `https://my-mac.tail12345.ts.net:3500`)

---

## 1단계: Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트** 클릭
3. 프로젝트 이름: `MyTok` (자유)
4. **만들기** 클릭
5. 생성된 프로젝트가 선택되어 있는지 확인

---

## 2단계: OAuth 동의 화면 구성

1. 좌측 메뉴: **APIs & Services** → **OAuth consent screen**
2. User Type: **External** 선택 → **만들기**
3. 앱 정보 입력:

| 항목 | 값 |
|------|-----|
| 앱 이름 | `MyTok` |
| 사용자 지원 이메일 | 본인 Gmail |
| 개발자 연락처 이메일 | 본인 Gmail |

4. **저장 후 계속** 클릭
5. **범위(Scopes)** 화면: 추가 없이 **저장 후 계속**
6. **테스트 사용자** 화면:
   - **+ ADD USERS** 클릭
   - MyTok에 로그인할 Gmail 주소 추가 (본인 + 가족/지인)
   - **저장 후 계속**

> ⚠️ **중요**: "테스트" 상태에서는 여기에 등록한 Gmail만 로그인 가능합니다.  
> 등록하지 않은 이메일은 OAuth 화면에서 차단됩니다.

---

## 3단계: OAuth 클라이언트 ID 생성

1. 좌측 메뉴: **APIs & Services** → **Credentials**
2. 상단 **+ CREATE CREDENTIALS** → **OAuth client ID**
3. 아래 값 입력:

| 항목 | 값 |
|------|-----|
| 애플리케이션 유형 | **웹 애플리케이션** |
| 이름 | `MyTok Web Client` |
| 승인된 JavaScript 원본 | `https://my-mac.tail12345.ts.net:3500` |
| 승인된 리디렉션 URI | `https://my-mac.tail12345.ts.net:3500/auth/google/callback` |

> 💡 **URL 예시** (본인 환경에 맞게 변경):
> - Tailscale: `https://my-mac.tail12345.ts.net:3500`
> - Cloudflare Tunnel: `https://chat.mydomain.com`
> - 로컬 개발: `http://localhost:3500`

4. **만들기** 클릭
5. 팝업에 표시되는 값을 복사합니다:
   - **클라이언트 ID**: `123456789-xxxx.apps.googleusercontent.com`
   - **클라이언트 보안 비밀번호**: `GOCSPX-xxxxxxx`

---

## 4단계: MyTok에 적용

`backend/.env` 파일을 열어 아래 값을 설정합니다:

```env
# ── Google OAuth 2.0 ─────────────────────────────────────────
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxx

# ── 세션 암호화 키 (아래 명령으로 생성) ──────────────────────
# bun -e "const crypto = await import('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"
SESSION_SECRET=여기에_생성된_64자리_hex_값

# ── 접근 허용 이메일 ────────────────────────────────────────
ALLOWED_EMAILS=you@gmail.com,family@gmail.com

# ── 관리자 이메일 ───────────────────────────────────────────
OWNER_EMAIL=you@gmail.com

# ── 서버 URL (OAuth 콜백에 사용) ────────────────────────────
BASE_URL=https://my-mac.tail12345.ts.net:3500
```

### 세션 키 생성 명령어

```bash
bun -e "const crypto = await import('crypto'); console.log(crypto.randomBytes(32).toString('hex'))"
```

---

## 5단계: 서버 시작 및 확인

```bash
./start-mytok.sh
```

브라우저에서 `BASE_URL`로 접속 → **Google로 로그인** 버튼 클릭 → Google 계정 선택 → MyTok 메인 화면 진입.

---

## ❓ 자주 묻는 질문

### Q: "이 앱은 Google에서 확인하지 않았습니다" 경고가 나옵니다

**정상입니다.** 개인용 앱이므로 Google 검증을 받을 필요가 없습니다.  
→ **고급** → **MyTok(으)로 이동(안전하지 않음)** 클릭하면 진행됩니다.

### Q: "Error 403: access_denied" 오류

2단계의 **테스트 사용자**에 해당 Gmail이 등록되어 있는지 확인하세요.

### Q: "redirect_uri_mismatch" 오류

3단계의 **승인된 리디렉션 URI**가 `backend/.env`의 `BASE_URL` + `/auth/google/callback`과 정확히 일치하는지 확인하세요.

- ✅ `https://my-mac.tail12345.ts.net:3500/auth/google/callback`
- ❌ `https://my-mac.tail12345.ts.net:3500/auth/google/callback/` (끝에 슬래시)
- ❌ `http://...` (https가 아닌 경우)

### Q: Tailscale URL을 모르겠습니다

```bash
tailscale status
```

또는 [Tailscale Admin Console](https://login.tailscale.com/admin/machines)에서 머신 이름과 DNS를 확인하세요.

### Q: 다른 사람을 추가하려면?

1. Google Cloud Console → OAuth 동의 화면 → **테스트 사용자**에 Gmail 추가
2. `backend/.env` → `ALLOWED_EMAILS`에 쉼표로 추가
3. 서버 재시작 (`./start-mytok.sh`)

---

## 🔒 보안 참고사항

- `GOOGLE_CLIENT_SECRET`과 `SESSION_SECRET`은 **절대 공개하지 마세요**
- `.env` 파일은 `.gitignore`에 포함되어 있어 git에 올라가지 않습니다
- `ALLOWED_EMAILS`에 등록되지 않은 Gmail은 OAuth 성공 후에도 MyTok 접근이 차단됩니다 (이중 보안)
