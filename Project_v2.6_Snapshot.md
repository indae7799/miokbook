# 📦 Project Snapshot: Bookstore v2.6 (Legacy Backup)

이 문서는 **v6 PRD** 기반의 고도화 작업을 시작하기 전, 기존에 구현된 **v2.6 버전**의 모든 작업 내역과 설정을 기록한 문서입니다. 모든 소스 코드는 `old_v2_6_backup/` 폴더에 원본 그대로 보존되어 있습니다.

---

## 🛠 1. 기술 스택 (Tech Stack)
기존 프로젝트에서 사용된 주요 사양입니다.

- **Frontend**: Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5.x
- **Styling**: TailwindCSS 4.x, shadcn/ui
- **State Management**: Zustand 5.0, React Query 5.90
- **Backend / DB**: Firebase Web SDK 12.10, Firebase Admin SDK 13.7, Firestore
- **External APIs**: Naver Search API, Aladin Open API
- **Payments**: Toss Payments SDK 2.6

---

## 🔑 2. 환경 변수 설정 (Environment Variables)
`.env.local`에 설정되어 있던 주요 키 목록입니다.

### Firebase
- `NEXT_PUBLIC_FIREBASE_*`: 클라이언트용 SDK 설정
- `FIREBASE_ADMIN_PRIVATE_KEY`: 서버 측 Firestore 접근용 비공개 키
- `FIREBASE_ADMIN_CLIENT_EMAIL`: `firebase-adminsdk-fbsvc@miokbook-4c24a.iam.gserviceaccount.com`

### Search & Details
- **Naver API**: `61ZFJ_KBzMcXp4nTvvFp` / `2jWDjNOQCC` (검색 기능)
- **Aladin API**: `ttbk56212111151001` (목차/서평 상세 정보)

---

## 🚀 3. 구현 완료된 핵심 기능 (Phase 1 완료 상태)

### [검색 기능]
- `src/lib/api/naver.ts`: 네이버 도서 검색 API 연동 완료.
- 저자명 정규화(`normalizeAuthor`) 로직 적용.

### [상세 정보 & 캐싱]
- `src/lib/api/aladin.ts`: 알라딘 API를 통한 목차(`toc`), 출판사 서평(`publisherReview`) 연동 완료.
- `src/lib/api/bookCache.ts`: Firestore `bookMeta` 컬렉션을 활용한 **24시간 TTL 캐시** 로직 구현.
  1. Firestore 캐시 우선 확인
  2. 캐시 없으면 네이버 API 호출 후 저장
  3. 알라딘 부가 정보 비동기 병합 (`enrichBookMetaWithAladin`)

### [인증 및 보안]
- Firebase Auth 연동 및 기본 레이아웃 구성.
- Firestore Security Rules 및 API 활성화 스위치(Google Cloud Console) 설정 완료.

---

## 📂 4. 주요 파일 위치 (참고용)
- **API 로직**: `old_v2_6_backup/src/lib/api/` (naver, aladin, bookCache)
- **Firebase 초기화**: `old_v2_6_backup/src/lib/firebase/` (client, admin)
- **유틸리티**: `old_v2_6_backup/src/lib/utils.ts` (ISBN 정규화 등)
- **컴포넌트**: `old_v2_6_backup/src/components/books/` (BookCard, 검색 결과 UI 등)

---

## ⚠️ 5. 주의 사항
- 본 백업은 **단일 프로젝트 구조**입니다. 새로운 **Monorepo** 구조 구축 시, 위 로직들을 `apps/web/src/lib/api` 및 `packages/utils` 등으로 분리하여 이식해야 합니다.
- **Firebase Cloud Functions** 사용으로 변경됨에 따라, `bookCache.ts`의 로직 중 일부(DB 쓰기 등)는 `functions/` 영역으로 이동될 예정입니다.

---
*Snapshot Created Date: 2026-03-15*
