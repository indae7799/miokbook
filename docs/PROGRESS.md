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
| 9 | SEO (layout metadata, sitemap, robots, books generateMetadata) | ✅ |
| 7 확장 | 랜딩 풀 버전 (QuickNav, Bestseller, FeaturedCuration, MonthlyPick, NewBooksGrid, CategoryGrid, ThemeCuration, EventsSection, ContentSection, AboutBookstore) | ✅ |
| 10 | Sentry (client/server/edge config, withSentryConfig), GitHub Actions CI | ✅ |
| 10-3·10-4 | 리뷰 시스템, 이벤트 신청 (CF + API + UI) | ✅ |
| 5-9·5-10 | Admin 이벤트 관리, Admin 콘텐츠 관리 | ✅ |

**Phase 13 (BNK API)** 는 API 키 발급 후 별도 진행. 그 외 TASKS 기준 테스크는 완료 상태.

---

## PRD 섹션별 구현 매핑 (docs_PRD.md 기준)

**테스크/랜딩은 PRD를 기준으로 작성·수정합니다.** 아래는 PRD 9·10·11과 코드 위치 대응입니다.

| PRD 섹션 | 내용 | 구현 위치 |
|----------|------|-----------|
| **§8 랜딩 페이지 구성** | Hero → QuickNav → 베스트셀러 → … → CategoryGrid → … → Footer 순서 | `apps/web/src/app/(store)/page.tsx`, `components/home/*` |
| **§9 BOOK DETAIL PAGE** | 상단(표지/제목/저자/가격/평점/리뷰수/장바구니·바로구매/품절배지), 책소개, 저자소개, 목차, 리뷰, 추천도서 | `apps/web/src/app/(store)/books/[slug]/page.tsx`, `components/books/BookDetail.tsx` |
| **§10 TRANSACTION** | createOrder → reserveStock → 토스 결제 → confirmPayment, expirePending, 취소/반품, 이벤트 신청 | `functions/src/*`, `apps/web/src/app/api/order/*`, `api/payment/*`, `api/events/register` |
| **§11 SEARCH** | Meilisearch(books), 검색/자동완성, 최근 검색어, 내 DB 우선 | `apps/web/src/app/api/search/*`, `HeaderSearch.tsx`, `searchHistory.store.ts` |

- **랜딩이 PRD와 다르게 나왔던 이유**: 예전 구현이 §8 페이지 구성 순서를 완전히 따르지 않았음. 지금은 §8 순서대로 배치되어 있음.
- **테스크 작성 기준**: `docs_TASKS.md`는 `docs_PRD.md` 섹션을 나누어 태스크로 만든 것이며, 구현 시 해당 PRD 문구(예: §9 상단 영역, §10 Step 1~5)를 참고해 맞춤.

---

## 어디서 확인하나요? (PRD 반영 경로)

### 스토어 (고객용)

| 경로 | 설명 |
|------|------|
| **/** | 홈 (캐러셀, 추천, 이달의 책, 베스트셀러, 이벤트·콘텐츠 섹션 등) |
| /books | 도서 목록 (검색·필터) |
| /books/[slug] | 도서 상세 |
| /curation | 큐레이션 홈 (MD 추천, 이달의 책, 테마 큐레이션 링크) |
| /curation/md, /curation/monthly, /curation/[id] | 큐레이션 상세 |
| /events | 이벤트 목록 |
| /events/[id] | 이벤트 상세 (신청 버튼) |
| /content | 콘텐츠 목록 |
| /content/[slug] | 콘텐츠 상세 |
| /cart | 장바구니 |
| /checkout | 결제 |
| /mypage | 마이페이지 (로그인 필요) |
| /login, /signup | 로그인·회원가입 |

### 관리자(CMS) — **여기서 확인**

| 경로 | 설명 |
|------|------|
| **/admin** | **관리자 대시보드** (오늘 주문·매출, 재고 부족, 최근 주문) |
| /admin/books | 도서·재고 관리, CSV 일괄 등록 |
| /admin/orders | 주문·반품 관리 |
| /admin/cms | **CMS (큐레이션)** — MD 추천·이달의 책·테마 큐레이션 D&D |
| /admin/marketing | **배너/팝업** — 히어로 배너, 팝업 이미지·링크 |
| /admin/events | 이벤트 등록/수정/삭제, 참가자 목록 |
| /admin/content | 콘텐츠(인터뷰·서점이야기) 등록/수정/삭제, 발행 토글 |

**관리자 접속**: 로그인 후 `https://{도메인}/admin` 직접 입력.  
**Admin 권한 설정**: Firebase Custom Claims `role: 'admin'` 필요.  
→ 상세 절차: **[docs/ADMIN_ACCESS.md](ADMIN_ACCESS.md)** 참고

**MVP 확인 순서 (PRD 수준 도서몰)**  
1) **도서**: 관리자 → [도서 관리](/admin/books) → CSV/엑셀(isbn, stock) 업로드 → **자료 수집** 클릭 → 스토어 &quot;도서&quot; 메뉴에 노출.  
2) **배너**: 관리자 → [배너/팝업](/admin/marketing) → **배너 추가** → 이미지 업로드·링크·저장 → 홈 상단 캐러셀 노출.  
3) **추천/큐레이션**: 관리자 → [CMS](/admin/cms)에서 MD 추천·이달의 책·테마 큐레이션 설정 → 홈·큐레이션 페이지 반영.

**로컬에서 500이 날 때**: Firebase Admin 환경 변수(`FIREBASE_ADMIN_*`)가 없거나 잘못되면 서버에서 Firestore 접근이 실패할 수 있습니다. `.env.local`에 올바른 값을 넣거나, 없으면 홈/큐레이션/이벤트/콘텐츠 페이지는 빈 데이터로 렌더되도록 되어 있어 500 대신 빈 화면이 나올 수 있습니다. 계속 500이면 터미널/콘솔 로그로 원인 확인.

- **CMS에서 편집한 내용**이 **스토어 홈·큐레이션·이벤트·콘텐츠**에 반영됩니다.  
  예: `/admin/cms`에서 추천 도서·이달의 책·테마 큐레이션 설정 → 홈·`/curation/*`에 노출.  
  `/admin/marketing`에서 배너 설정 → 홈 캐러셀·팝업 노출.  
  `/admin/events`, `/admin/content`에서 등록한 이벤트·콘텐츠 → `/events`, `/content`에 노출.

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

**추가 구현 (PRD §8·§11 보완)**  
- Header 검색창: `StoreHeader` + `HeaderSearch` (PRD §8 1번)  
- 검색 자동완성: `/api/search?autocomplete=true` (제목·저자)  
- 최근 검색어: Zustand persist (`searchHistory.store.ts`)  
- CMS Admin 접속 가이드: `docs/ADMIN_ACCESS.md`

---

*마지막 업데이트: Header 검색·자동완성·최근검색어·ADMIN_ACCESS 문서화*
