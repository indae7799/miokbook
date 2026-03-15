# 진행 상황 및 이어서 하기 가이드

> **기준 문서**: `docs/docs_PRD.md`(제품 명세), `docs/docs_TASKS.md`(태스크 목록)  
> 이어서 할 때: "docs/PRD.md 와 docs/TASKS.md 읽고 [Task명] 시작해줘" 로 Cursor에 요청하면 됩니다.

---

## 완료된 Phase 요약

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Monorepo, Next.js 14, .cursorrules | ✅ |
| 2 | 스키마 (Book, Order, User, CMS 등) | ✅ |
| 3 | Firebase (Auth, Firestore, Storage, Functions) | ✅ |
| 4 | API 라우트 (books, search, orders 등) | ✅ |
| 5 | Admin (도서/주문/CMS/마케팅 관리, CSV, DragSortable) | ✅ |
| 6 | 스토어프론트 (홈, 도서 목록/상세, 장바구니) | ✅ |
| 7 | 검색 (Meilisearch, syncToMeilisearch) | ✅ |
| 8 | **결제·취소·반품** (createOrder, reserveStock, checkout, Toss 결제창, confirmPayment, success/fail 페이지, 웹훅, expirePendingOrders, cancelOrder, requestReturn) | ✅ |
| 8-9 | 반품 신청 CF + API + 마이페이지 연동 | ✅ |

---

## 다음에 할 작업 (Phase 9 ~)

### Phase 9 — SEO & 성능 (우선 추천)

- **[Task 9-1] SEO 전체**
  - `apps/web/src/app/layout.tsx` 기본 metadata
  - `apps/web/src/app/sitemap.ts` (Firestore 기반 동적 사이트맵)
  - `apps/web/src/app/robots.ts` (/admin disallow)
  - `books/[slug]/page.tsx` generateMetadata 점검 (title, description, openGraph, twitter)

### Phase 10 — 모니터링 & CI/CD

- **[Task 10-1] Sentry** (apps/web)
- **[Task 10-2] GitHub Actions CI** (.github/workflows/ci.yml)

### Phase 7 확장 — 큐레이션·이벤트·콘텐츠

- 홈 추가 섹션 (BestsellerSection, FeaturedCuration, MonthlyPick 등)
- 큐레이션/이벤트/콘텐츠 페이지 및 컴포넌트

---

## 기술 스택·경로 요약

- **실행**: 루트에서 `pnpm run dev` (또는 `node scripts/run-next.js` → apps/web 기동)
- **웹 앱**: `apps/web` (Next.js 14 App Router)
- **패키지**: `packages/schemas`, `packages/utils`
- **백엔드**: `functions/` (Firebase Cloud Functions), Callable은 `https://{region}-{projectId}.cloudfunctions.net/{함수명}` 형태로 호출
- **설계 원본**: `docs/docs_PRD.md` 만 참고 (다른 PRD 버전 무시)

---

## 환경 변수 (배포/로컬 시 필요)

**apps/web (.env.local 등)**

- `NEXT_PUBLIC_FIREBASE_*` (프로젝트 ID, API Key 등)
- `FIREBASE_ADMIN_*` (서버/API용)
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_WEBHOOK_SECRET` (선택)
- Meilisearch: `NEXT_PUBLIC_MEILISEARCH_*`, `MEILISEARCH_MASTER_KEY`
- Upstash(rate limit): `UPSTASH_REDIS_REST_*`

**Firebase Functions**

- `TOSS_SECRET_KEY` (결제 승인/취소)
- 기타 Functions용 env

---

## GitHub에 올린 뒤 내일 이어서 하는 방법

1. **저장소 생성**: GitHub에서 새 repo 생성 (예: `온라인미옥` 또는 `online-miok`)  
2. **원격 추가 및 푸시** (이미 `git init` 및 첫 커밋 후):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
3. **내일 작업 시작 시**: 이 폴더 클론 또는 pull 후, Cursor에서  
   `docs/docs_PRD.md 와 docs/docs_TASKS.md 읽고 [Task 9-1] SEO 전체 구현 시작해줘`  
   처럼 **태스크명을 구체적으로** 적어 주면 이어서 진행하기 좋습니다.

---

*마지막 업데이트: Phase 8·8-9 완료 기준*
