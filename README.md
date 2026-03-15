# 온라인미옥 — 독립서점 온라인 플랫폼

독립서점 경험을 온라인으로 확장하는 도서 쇼핑·큐레이션 플랫폼입니다.

## 문서

| 문서 | 설명 |
|------|------|
| **docs/docs_PRD.md** | 제품 요구사항(PRD) — **설계의 기준 문서** |
| **docs/docs_TASKS.md** | Phase별 태스크 목록 (AI 작업 프롬프트) |
| **docs/PROGRESS.md** | **진행 상황·다음 할 일·이어서 하기 가이드** |

새로 이어서 개발할 때는 `docs/PROGRESS.md`와 `docs/docs_TASKS.md`를 보고 해당 Task를 Cursor에 요청하면 됩니다.

## 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **State**: Zustand, TanStack Query
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **결제**: Toss Payments
- **검색**: Meilisearch

## 실행 (로컬에서 확인)

```bash
# 의존성 설치
pnpm install

# 웹 앱 개발 서버 (루트에서)
pnpm run dev
```

웹은 **http://localhost:5175** 에서 실행됩니다. 브라우저에서 접속해 랜딩(홈) 페이지를 확인할 수 있습니다.

- 포트 5175가 이미 사용 중이면 기존 프로세스를 종료하거나, `apps/web`에서 `npm run dev -- -p 3000` 처럼 다른 포트로 실행하세요.

## 프로젝트 구조

```
apps/web          # Next.js 웹 앱
packages/schemas  # 공용 Zod 스키마
packages/utils    # 유틸(배송비 등)
functions         # Firebase Cloud Functions
docs              # PRD, TASKS, PROGRESS
```

## 환경 변수

- `.env.example`이 있다면 참고하여 `.env.local`(웹), Firebase Functions용 env를 설정하세요.
- 비밀키(결제 시크릿, Firebase Admin 키 등)는 저장소에 커밋하지 마세요.

## GitHub에 저장하기

1. GitHub에서 새 저장소 생성 (예: `online-miok`, Private 가능).
2. 아래 명령으로 원격 추가 후 푸시:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

3. 내일 이어서 할 때: 저장소 클론 또는 `git pull` 후 **docs/PROGRESS.md**를 보고 다음 Task를 진행하면 됩니다.

## 라이선스

Private / 프로젝트 정책에 따릅니다.
