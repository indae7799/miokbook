# 온라인미옥

미옥서원 온라인 스토어 프로젝트입니다.  
현재 웹 서비스의 주요 데이터 레이어는 Supabase 기준으로 운영합니다.

## 현재 운영 구조
- Web: Next.js 14 App Router
- DB: Supabase
- Search: Meilisearch
- Auth: Firebase Auth
- Storage: Firebase Storage
- Payments: Toss Payments

중요:
- Firestore는 웹 앱의 주 데이터 저장소로 더 이상 사용하지 않습니다.
- Firebase는 현재 `Auth`, `Storage` 중심으로만 사용합니다.

## 문서
- [운영 런북](C:\Users\jungindae\Desktop\온라인미옥\OPERATIONS_RUNBOOK.md)
- [PRD](C:\Users\jungindae\Desktop\온라인미옥\docs\docs_PRD.md)
- [작업 목록](C:\Users\jungindae\Desktop\온라인미옥\docs\docs_TASKS.md)
- [진행 현황](C:\Users\jungindae\Desktop\온라인미옥\docs\PROGRESS.md)
- [도메인 및 검색 노출 운영 가이드](C:\Users\jungindae\Desktop\온라인미옥\docs\도메인_및_검색노출_운영가이드.md)

## 프로젝트 구조
```text
apps/web          Next.js 스토어 웹앱
functions         Firebase Functions 레거시/보조 영역
packages/schemas  공용 스키마
packages/utils    공용 유틸
docs              운영/기획 문서
supabase          스키마 및 관련 자산
tests             테스트
```

## 로컬 실행
요구사항:
- Node.js 20+
- pnpm

설치:
```bash
pnpm install
```

실행:
```bash
pnpm run dev
```

기본 주소:
- `http://localhost:3000`

대체 실행:
```bash
cd apps/web
npm run dev:5175
```

`.next` 잠금이나 Windows 캐시 문제가 있으면:
```bash
cd apps/web
npm run dev:clean
```

## 주요 스크립트
루트:
```bash
pnpm run dev
pnpm run build
pnpm run typecheck
pnpm run test
```

웹 앱:
```bash
cd apps/web
npm run dev
npm run build
npm run typecheck
```

## 환경변수
주요 항목:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ALADIN_TTB_KEY`
- `MEILISEARCH_MASTER_KEY`
- `NEXT_PUBLIC_MEILISEARCH_HOST`

주의:
- 비밀키, 서비스 롤 키, 결제 키는 커밋하지 않습니다.
- 프로덕션 검색 노출을 위해 `NEXT_PUBLIC_SITE_URL`은 실제 도메인으로 맞춰야 합니다.

## 배포 및 검색 노출
- Vercel 배포를 사용합니다.
- 실서비스 검색 노출은 `vercel.app` 임시 주소보다 커스텀 도메인 연결을 권장합니다.
- 관련 운영 기준은 아래 문서를 따릅니다.
  - [도메인 및 검색 노출 운영 가이드](C:\Users\jungindae\Desktop\온라인미옥\docs\도메인_및_검색노출_운영가이드.md)

## 참고
- 검색, 신간 수집, 도서 상세 보강은 Supabase + Meilisearch + 외부 도서 API 기준으로 동작합니다.
- 레거시 Functions 는 아직 일부 관찰/보조 용도로 남아 있을 수 있으므로 삭제 전 런북을 확인합니다.

## 라이선스
Private repository.
