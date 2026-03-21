# CMS Admin 접속 가이드

> 관리자(CMS) 페이지에 접속하는 방법과 Admin 권한 설정 절차입니다.

---

## 1. 접속 URL

| 환경 | URL |
|------|-----|
| 로컬 | `http://localhost:3000/admin` |
| 배포 | `https://{도메인}/admin` |

**주의**: 일반 사용자 UI에는 Admin 링크가 없습니다. 관리자는 위 URL을 직접 입력해야 합니다.

---

## 2. 접속 조건

1. **로그인** — `/login`에서 이메일+비밀번호 또는 Google 로그인
2. **Admin 권한** — Firebase **Custom Claims**에 `role: 'admin'` 설정

`users/{uid}.role` 필드가 아니라 **ID 토큰의 Custom Claims**를 확인합니다.

---

## 3. Admin 권한 부여 방법

### 방법 0: 마스터 관리자 계정 1회 생성 (가장 간단)

프로젝트에 **마스터 관리자 계정**을 한 번 생성해 두면, 해당 이메일/비밀번호로 바로 로그인해 Admin에 접속할 수 있습니다.

- **이메일**: `admin@admin.local` (Firebase는 이메일 로그인만 지원)
- **비밀번호**: `admin`
- **실행 방법** (프로젝트 루트 또는 apps/web에서):
  ```bash
  pnpm --dir apps/web run create-admin
  ```
  또는 `apps/web` 폴더로 이동 후:
  ```bash
  pnpm run create-admin
  ```
- **필수**: `apps/web/.env.local`에 Firebase Admin 환경 변수가 있어야 합니다.  
  - `apps/web/.env.example`을 복사해 `.env.local`로 두고, Firebase Console에서 **서비스 계정 > 새 비공개 키 생성**으로 받은 JSON 안의 `private_key` 값을 `FIREBASE_ADMIN_PRIVATE_KEY`에 넣으면 됩니다. (프로젝트 miokbook 기준 클라이언트/Admin 예시는 `.env.example`에 이미 들어 있습니다.)
- 스크립트는 계정이 없으면 생성하고, 있으면 해당 계정에 `role: 'admin'` Custom Claims만 설정합니다.
- 생성 후 **로그인**: `/login` → 이메일 `admin@admin.local`, 비밀번호 `admin` 입력 → 로그인 후 `http://localhost:3000/admin` 접속.

---

### 방법 A: Firebase Admin SDK (기존 사용자에게 권한 부여)

Firebase Admin SDK로 해당 사용자 UID에 Custom Claims를 설정합니다.

```javascript
// Node 스크립트 또는 Cloud Functions에서 1회 실행
const admin = require('firebase-admin');

// 초기화 (이미 되어 있다면 생략)
admin.initializeApp();

async function setAdmin(uid) {
  await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
  console.log('Admin 권한 부여 완료:', uid);
}

// 사용자 UID를 Firebase Console > Authentication > Users에서 확인
setAdmin('사용자_UID_여기');
```

**UID 확인**: Firebase Console → Authentication → Users → 해당 사용자 선택 → UID 복사

### 방법 B: Firebase Extensions

"Blocking Functions" 또는 "Set Custom User Claims" 같은 확장 프로그램을 사용할 수 있습니다.

### 방법 C: Firebase Console

Firebase Console에서는 Custom Claims를 직접 수정할 수 없습니다. **방법 A**를 사용해야 합니다.

---

## 4. 접속 후 동작

| 조건 | 결과 |
|------|------|
| `role: 'admin'` 있음 | Admin 레이아웃 표시 (대시보드, 도서, 주문, CMS, 배너, 이벤트, 콘텐츠) |
| `role: 'admin'` 없음 | `/`(홈)으로 리다이렉트 |
| 미로그인 | `/login`으로 리다이렉트 |

---

## 5. Admin 메뉴 구조

| 경로 | 설명 |
|------|------|
| `/admin` | 대시보드 (오늘 주문·매출, 재고 부족, 최근 주문) |
| `/admin/books` | 도서·재고 관리, CSV 일괄 등록 |
| `/admin/orders` | 주문·반품 관리 |
| `/admin/cms` | CMS (큐레이션) — MD 추천·이달의 책·테마 큐레이션 |
| `/admin/marketing` | 배너/팝업 관리 |
| `/admin/events` | 이벤트 등록/수정/삭제, 참가자 목록 |
| `/admin/content` | 콘텐츠(인터뷰·서점이야기) 등록/수정/삭제 |

---

## 6. 트러블슈팅

### Admin 페이지 접속 시 홈으로 리다이렉트됨

- **원인**: Custom Claims에 `role: 'admin'`이 없음
- **해결**: 위 3번 방법으로 Custom Claims 설정 후, **로그아웃 후 재로그인** (토큰 갱신 필요)

### API 호출 시 401/403 에러

- Admin API는 `Authorization: Bearer {idToken}` 헤더 필요
- 로그인 상태에서만 토큰이 발급되며, Admin 페이지는 자동으로 토큰을 포함해 요청합니다.

### Firebase Admin 환경 변수 미설정

- `.env.local`에 `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`가 없으면 Admin API가 동작하지 않을 수 있습니다.

---

*참고: PRD §16 Auth, docs_PRD.md*
