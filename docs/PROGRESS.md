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

- **외부 API 정책**: 검색 fallback·도서 자료 수집은 **현재 알라딘 API만** 사용. BNK API 연동은 **Phase 13**으로 키 발급 후 추후 진행.

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

**로컬에서 500이 날 때**
1. **터미널 로그 확인**: `pnpm run dev` 실행 후 브라우저에서 해당 페이지를 열면, 500이 난 요청의 **에러 메시지와 스택이 터미널에 출력**됩니다. `[HomePage] 데이터 로드 실패:` 로 시작하는 로그가 있으면 Firestore/환경 쪽 이슈입니다.
2. **환경 변수**: `apps/web/.env.local`에 `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*` 등이 없거나 잘못되면 Firestore 접근이 실패할 수 있습니다. 없어도 홈은 빈 데이터로 렌더되도록 되어 있어 500 대신 빈 화면이 나오는 것이 정상입니다.
3. **포트 3000 사용 중(EADDRINUSE)**: 이미 다른 프로세스가 3000을 쓰고 있으면 서버가 안 뜹니다. 해당 프로세스를 종료하거나, `npm run dev:5175` 등 다른 포트 스크립트를 쓰세요.

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

## 분석(GA4)·배포(Vercel / AWS·Cloudflare)

- **GA4**: `NEXT_PUBLIC_GA_MEASUREMENT_ID`만 설정하면 **어떤 호스팅에서든** 동작합니다.  
  Vercel이 아니어도 되며, 추후 도메인 구매 후 **AWS·Cloudflare**로 옮겨도 GA4는 그대로 사용 가능합니다.  
  (검색·장바구니 담기·결제 완료 이벤트는 `lib/gtag.ts` + 각 화면에서 전송됨.)
- **Vercel Analytics** (`@vercel/analytics`): **Vercel에 배포할 때만** 의미 있습니다.  
  AWS·Cloudflare만 쓸 예정이면 `NEXT_PUBLIC_VERCEL_ANALYTICS=false`로 끄거나, 패키지 제거 후 `Analytics.tsx`에서 해당 부분만 제거하면 됩니다.
- **의존성**: `@vercel/analytics`는 Vercel 배포 시 활용용이므로, 다른 호스팅만 쓸 경우 제거해도 되고, GA4만 써도 분석에는 문제 없습니다.

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

## 수정 PRD(수정prd.md) 반영 현황

`docs/수정prd.md` Section 14 실행 체크리스트 기준으로, **대부분 반영 완료**입니다.

| Tier | 항목 | 반영 여부 |
|------|------|-----------|
| **P0** | P0-1a 팝업 스토어 노출 | ✅ StorePopup, 오늘 보지 않기 |
| | P0-1b main_top 배너 | ✅ TopBannerStrip |
| | P0-1c sidebar 배너 | ✅ SidebarBannerSlot |
| | P0-2 업로드 안정화 | ⚠️ API/UI 존재, 운영 중 500 여부는 환경별 검증 |
| | P0-3 큐레이션 데이터 계약 통일 | ✅ themeCurations·recommendationText/description 노출 |
| **P1** | P1-1 이벤트 원자성+취소 | ✅ runTransaction, cancelRegistration |
| | P1-2 리뷰 O(1) 집계 | ✅ ratingTotal/reviewCount increment |
| | P1-3 결제/웹훅 멱등성 | ✅ 상태·재고 정합성 보강 반영 |
| | P1-4 관리자 권한 | ✅ bulkCreateBooks admin claim 검증 |
| **P2** | P2-1 주문 CSV 추출 | ✅ 기간/상태 필터, CSV 다운로드 |
| | P2-2 반품 운영 완성 | ✅ 재고 복원·관리자 UI |
| | P2-3 하이브리드 검색 | ✅ 알라딘 fallback, ISBN dedup (입고 알림 Lead는 선택·미구현 가능) |
| | P2-4 콘텐츠 마크다운 | ✅ MarkdownContent (react-markdown) |
| | P2-4b 큐레이션 추천문 노출 | ✅ |
| | P2-5 대시보드 KPI | ✅ 일 매출·재고 부족·미처리 반품·dailyRevenue |
| **P3** | P3-1 Product JSON-LD | ✅ 도서 상세 application/ld+json |
| | P3-2 GA4/Vercel Analytics | ✅ 검색·장바구니·결제 이벤트 포함 |
| | P3-3 엑셀/문구 일치화 | ✅ CSV 전용 명시·가이드 |

**정리**: 수정 PRD에서 요구한 **핵심 항목은 모두 반영**된 상태입니다.  
입고 알림 리드 수집은 수정 PRD에서 "(선택)"으로 되어 있어 미구현이어도 완료 범위에서 제외하지 않았습니다.  
BNK API는 Phase 13으로 **키 발급 후 별도 진행** 예정입니다.

---

*마지막 업데이트: 수정 PRD 반영 현황·API 정책(알라딘 한정, BNK 추후) 반영*
