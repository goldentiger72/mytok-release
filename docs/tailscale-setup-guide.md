# 🌐 Tailscale 설치 및 MyTok 연동 가이드

Tailscale은 WireGuard 기반의 VPN으로, 공개 포트 없이 안전하게 MyTok 서버에 접속할 수 있게 해줍니다.  
서버(맥미니/PC)와 접속 기기(스마트폰/노트북) **양쪽 모두**에 설치해야 합니다.

---

## 📋 개념 요약

```
[내 스마트폰]  ──── Tailscale VPN 터널 ────  [맥미니 서버]
  (클라이언트)      (암호화, 공개 포트 없음)      (MyTok 실행)
```

- 같은 Tailscale 계정(tailnet)에 연결된 기기만 서로 접속 가능
- 인터넷에 포트를 열지 않아 해킹 위험 최소화
- 외부 와이파이/LTE에서도 접속 가능

---

## 1단계: Tailscale 계정 생성

1. [https://login.tailscale.com/start](https://login.tailscale.com/start) 접속
2. **Google**, **Microsoft**, **GitHub** 중 하나로 로그인
3. 계정 생성 완료 (무료 플랜으로 충분합니다 — 개인 사용 100대까지 무료)

---

## 2단계: 서버에 Tailscale 설치 (MyTok이 실행되는 머신)

### macOS (맥미니/맥북)

1. [Mac App Store에서 Tailscale](https://apps.apple.com/app/tailscale/id1475387142) 다운로드
2. 또는 Homebrew:
   ```bash
   brew install --cask tailscale
   ```
3. 앱 실행 → 메뉴바 아이콘 클릭 → **Log in** → 1단계의 계정으로 로그인
4. **Connected** 상태 확인

### Linux (Ubuntu/Debian)

```bash
# 설치
curl -fsSL https://tailscale.com/install.sh | sh

# 로그인 (브라우저 링크가 표시됨)
sudo tailscale up

# 상태 확인
tailscale status
```

### Windows

1. [https://tailscale.com/download/windows](https://tailscale.com/download/windows) 에서 다운로드
2. 설치 후 실행 → 시스템 트레이 아이콘 → **Log in**
3. 1단계의 계정으로 로그인

---

## 3단계: 접속 기기에 Tailscale 설치

MyTok에 접속할 **모든 기기**에 설치합니다.

### iPhone / iPad

1. [App Store에서 Tailscale](https://apps.apple.com/app/tailscale/id1470499037) 다운로드
2. 앱 실행 → **Log in** → 같은 계정으로 로그인
3. VPN 설정 허용

### Android

1. [Play Store에서 Tailscale](https://play.google.com/store/apps/details?id=com.tailscale.ipn) 다운로드
2. 앱 실행 → **Log in** → 같은 계정으로 로그인
3. VPN 연결 허용

### macOS / Windows / Linux

서버와 동일한 방법으로 설치 (2단계 참조)

---

## 4단계: 서버 주소 확인

서버 머신에서:

```bash
tailscale status
```

출력 예시:
```
100.64.1.2   my-macmini   leejieun@   macOS   -
100.64.1.3   iphone       leejieun@   iOS     -
```

또는 [Tailscale Admin Console](https://login.tailscale.com/admin/machines)에서 확인:

| 머신 이름 | DNS 이름 | IP |
|-----------|----------|-----|
| my-macmini | `my-macmini.tail12345.ts.net` | 100.64.1.2 |

> 💡 **MagicDNS 주소**를 사용하면 IP를 외울 필요가 없습니다:  
> `https://my-macmini.tail12345.ts.net:3500`

---

## 5단계: HTTPS 인증서 활성화 (권장)

Tailscale은 자동으로 HTTPS 인증서를 발급해줍니다:

```bash
# 서버 머신에서 실행
tailscale cert my-macmini.tail12345.ts.net
```

인증서 파일이 생성됩니다:
- `my-macmini.tail12345.ts.net.crt` (인증서)
- `my-macmini.tail12345.ts.net.key` (키)

> ℹ️ MyTok은 현재 Express HTTP 서버로, Tailscale 터널 자체가 암호화를 제공합니다.  
> HTTPS가 필요한 경우 (PWA 설치 등) 향후 설정 가이드를 추가합니다.

---

## 6단계: MyTok 환경변수 설정

`backend/.env`에서 `BASE_URL`을 Tailscale 주소로 설정:

```env
BASE_URL=https://my-macmini.tail12345.ts.net:3500
```

Google OAuth의 **승인된 리디렉션 URI**도 이 주소로 설정해야 합니다:
```
https://my-macmini.tail12345.ts.net:3500/auth/google/callback
```

→ 자세한 내용은 [📖 OAuth 설정 가이드](oauth-setup-guide.md) 참조

---

## 7단계: 접속 테스트

1. 서버에서 MyTok 시작:
   ```bash
   ./start-mytok.sh --tailscale
   ```

2. 접속 기기에서 **Tailscale 연결 상태** 확인 (초록색 아이콘)

3. 브라우저에서 접속:
   ```
   https://my-macmini.tail12345.ts.net:3500
   ```

4. Google 로그인 → MyTok 메인 화면 진입 → ✅ 완료!

---

## ❓ 자주 묻는 질문

### Q: 외출 중에도 접속이 되나요?

**네.** Tailscale은 인터넷이 연결된 어디서든 (LTE/와이파이/해외) VPN 터널을 통해 서버에 접속할 수 있습니다. 스마트폰의 Tailscale 앱이 켜져 있으면 됩니다.

### Q: 가족/친구에게 접속 권한을 주려면?

**방법 1 — 같은 Tailscale 계정 공유** (가장 간단):
- 가족 기기에 Tailscale 설치 → 같은 계정으로 로그인

**방법 2 — Tailscale 공유 노드** (계정 분리):
1. [Admin Console](https://login.tailscale.com/admin/machines) → 서버 머신 → **Share…**
2. 상대방의 Tailscale 계정으로 공유
3. 상대방이 공유 수락 → 접속 가능

두 경우 모두 `backend/.env`의 `ALLOWED_EMAILS`에 상대방 Gmail을 추가해야 합니다.

### Q: "연결할 수 없음" 오류

1. 양쪽 기기 모두 Tailscale **Connected** 상태인지 확인
2. 서버에서 `tailscale ping 접속기기이름` 으로 연결 테스트
3. MyTok 서버가 실행 중인지 확인 (`./start-mytok.sh`)
4. 방화벽이 3500 포트를 막고 있지 않은지 확인:
   ```bash
   # macOS
   curl http://localhost:3500
   ```

### Q: Tailscale 없이도 사용할 수 있나요?

**네.** Cloudflare Tunnel이나 로컬 네트워크에서도 사용 가능합니다:
- 로컬: `./start-mytok.sh --local` → `http://localhost:3500`
- Cloudflare: `./start-mytok.sh --cloudflare` (별도 설정 필요)

하지만 **보안과 편의성** 면에서 Tailscale을 강력히 권장합니다.

### Q: 배터리/데이터 소모가 심하지 않나요?

Tailscale은 WireGuard 기반으로 매우 가볍습니다. 백그라운드 유지 시에도 배터리·데이터 소모가 거의 없습니다.

---

## 📊 네트워크 방식 비교

| 방식 | 보안 | 외부 접속 | 설정 난이도 | 비용 |
|------|------|----------|------------|------|
| **Tailscale** ⭐ | 최고 (공개 포트 없음) | ✅ 어디서든 | 쉬움 | 무료 |
| Cloudflare Tunnel | 높음 | ✅ 어디서든 | 중간 | 무료 |
| 로컬 네트워크 | 중간 | ❌ 같은 와이파이만 | 가장 쉬움 | 무료 |
| 포트 포워딩 | ⚠️ 위험 | ✅ | 어려움 | 무료 |

---

## 🔗 관련 링크

- [Tailscale 공식 문서](https://tailscale.com/kb)
- [Tailscale 다운로드](https://tailscale.com/download)
- [Tailscale Admin Console](https://login.tailscale.com/admin/machines)
- [📖 OAuth 설정 가이드](oauth-setup-guide.md)
