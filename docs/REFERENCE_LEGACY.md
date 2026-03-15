# 레거시 백업 참조 (old_v2_6_backup)

현재 monorepo(PRD 기준) 구현 시 참고할 수 있는 기존 구현 위치입니다.

---

## 1. 알라딘 API 키

- **위치:** `old_v2_6_backup/.env.local`
- **변수:** `ALADIN_TTB_KEY=ttbk56212111151001`
- **사용처:** `functions/.env` 에 동일 키 설정 시 bulkCreateBooks, syncBookStatus 에서 사용

---

## 2. 인증 (이메일 / 구글 / 네이버)

### 이메일 로그인·회원가입 (구현됨)

| 항목 | 경로 |
|------|------|
| 로그인 페이지 | `old_v2_6_backup/src/app/(store)/auth/login/page.tsx` |
| 회원가입 페이지 | `old_v2_6_backup/src/app/(store)/auth/register/page.tsx` |

- **로그인:** `signInWithEmailAndPassword`, Zod 검증, Firebase 에러 메시지 매핑
- **회원가입:** `createUserWithEmailAndPassword` + `updateProfile`, Firestore `users/{uid}` 에 `setDoc` (uid, email, displayName, provider: 'email', 약관 등)
- **UI:** 이메일/비밀번호 폼, 비밀번호 표시 토글, 카카오/네이버/Google 버튼 (버튼만 있고 OAuth 연동은 미구현)

### 소셜 로그인 (env·UI만 준비됨)

- **로그인 페이지:** 카카오 / 네이버 / Google 버튼 존재, `signInWithPopup` 등 실제 OAuth 호출 코드는 없음
- **env (old_v2_6_backup/.env.local):**
  - 네이버 로그인: `NAVER_LOGIN_CLIENT_ID`, `NAVER_LOGIN_CLIENT_SECRET`, `NAVER_LOGIN_CALLBACK_URL`
  - 카카오: `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL`
- **PRD:** 이메일+비밀번호, Google OAuth 지원. 네이버는 추후 커스텀 토큰 방식 예정

### Firebase 클라이언트

- `old_v2_6_backup/src/lib/firebase/client.ts` — auth, db export 등 (참고용)

---

## 3. 네이버 API (도서 검색, 로그인 아님)

- **경로:** `old_v2_6_backup/src/lib/api/naver.ts`
- **용도:** 네이버 **도서 검색/상세 API** (NAVER_SEARCH_CLIENT_ID/SECRET)
- 로그인 OAuth와는 별도

---

Phase 3(인증) 작업 시 위 로그인/회원가입 페이지와 Firebase client 구성을 레퍼런스로 참고하면 됩니다.
