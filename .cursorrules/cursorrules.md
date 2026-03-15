# .cursorrules
# ═══════════════════════════════════════════════════════════
# Cursor가 모든 메시지에서 자동으로 읽는 파일입니다.
# ═══════════════════════════════════════════════════════════

## 필수 문서
- 설계 원본: docs/PRD.md   (아키텍처, DB 스키마, UX 스펙, 모든 정책)
- 작업 목록: docs/TASKS.md (Phase별 구현 단위)

작업 시작 전 반드시 두 파일을 읽는다.
두 파일 내용이 이 파일과 충돌하면 docs/PRD.md 를 우선한다.

## AI ROLE
You are a Senior Staff Software Engineer specializing in
production-grade Next.js + Firebase e-commerce platforms.
Implement code exactly as specified in docs/PRD.md.
Do NOT invent new patterns, libraries, or architectures.
When unclear: state your assumption clearly, then proceed.
Do NOT stop unless there is a genuine architectural conflict.

## TECH STACK (고정)
Next.js 14 App Router | TypeScript strict | TailwindCSS | shadcn/ui
Zustand (client state) | @tanstack/react-query v5 (server state)
Zod v3 | Firebase Auth + Firestore + Cloud Functions v2
Meilisearch | Toss Payments v2 | pnpm workspace

## ❌ 절대 금지
- TypeScript any 타입
- localStorage 직접 접근
- Zustand에 서버 데이터 저장
- React Query에 cart/UI 상태 저장
- Client SDK로 inventory/orders/payments/reviews/events 쓰기
- query key 인라인 (queryKeys.ts에서 import)
- filters: Record<string, any> (BookFilters 타입 사용)
- Firestore 읽기 후 Zod 검증 없이 사용
- PRD 허용 목록 외 라이브러리 추가
- Redux / MobX / Prisma / Supabase / GraphQL / axios
- NEXT_PUBLIC_ 없는 환경변수를 클라이언트에서 접근
- apps/web/src/schemas/ 폴더 생성 (packages/schemas에서 import)
- DB 필드명 snake_case 사용 (camelCase 통일)
- 알라딘 cover URL을 coverImage 필드에 직접 저장 (반드시 Firebase Storage에 다운로드 후 내 URL 저장)

## ✅ 반드시 준수
- Firestore 읽기: Schema.parse(data) 또는 Schema.safeParse(data)
- 모든 button, a, input: min-h-[48px] min-w-[48px]
- 전화/우편번호: type="tel" inputMode="numeric" pattern="[0-9]*"
- fixed bottom-0 요소: pb-[env(safe-area-inset-bottom)]
- 빈 배열: <EmptyState /> 사용 (텍스트 하드코딩 금지)
- 이미지: object-fit: cover 기본
- API 응답: { data: T } 또는 { error: ErrorCode }
- 컴포넌트 150줄 초과: Presentational + Custom Hook 분리
- JSDoc 주석: purpose, params, returns, sideEffect

## STATE 규칙
Zustand     → cart, ui, modal 전용
React Query → books, orders, events, articles, cms 전용
혼용 금지

## DB WRITE 규칙
inventory, orders, payments → Cloud Functions만 (runTransaction)
reviews                     → Cloud Functions만 (구매 이력 검증 필요)
events(registeredCount)     → Cloud Functions만 (정원 초과 방지)
books                       → Admin API Route → Cloud Functions
users                       → Firestore Client SDK 허용 (name, phone, addresses만)
cms                         → Admin API Route → Cloud Functions

## 폴더 구조 (이 외 신규 폴더 생성 금지)
apps/web/src/app/(store)/           사용자 화면
apps/web/src/app/(admin)/           관리자 화면
apps/web/src/app/(auth)/            로그인/회원가입
apps/web/src/app/api/               API Routes (Gateway only)
apps/web/src/components/common/     SmartLink, EmptyState, ToastProvider
apps/web/src/components/books/      BookCard, BookCarousel, BookDetail
apps/web/src/components/home/       홈 섹션 컴포넌트들
apps/web/src/components/events/     EventCard
apps/web/src/components/content/    ArticleCard
apps/web/src/components/admin/      DragSortableList, ImagePreviewUploader
apps/web/src/hooks/                 useAuthGuard, useAdminGuard, useCart, useBookSearch
apps/web/src/store/                 cart.store.ts, ui.store.ts
apps/web/src/lib/firebase/          client.ts, admin.ts
apps/web/src/lib/                   queryKeys.ts, meilisearch.ts
packages/schemas/src/               모든 Zod 스키마 (여기서만 정의)
packages/utils/src/                 formatter.ts, shipping.ts
functions/src/                      모든 Cloud Functions

## DB 필드명 규칙 (camelCase 통일)
coverImage (cover_image 금지)
listPrice, salePrice (price 단일 필드 금지)
publishDate (publish_date 금지)
userId (user_id 금지)
reviewCount (review_count 금지)

## ERROR CONTRACT
{ data: T } 성공
{ error: "STOCK_SHORTAGE"|"ORDER_NOT_FOUND"|"ORDER_EXPIRED"|
         "PAYMENT_FAILED"|"PAYMENT_CANCELLED"|
         "EVENT_FULL"|"ALREADY_REGISTERED"|
         "UNAUTHORIZED"|"FORBIDDEN"|"VALIDATION_ERROR"|"INTERNAL_ERROR" } 실패

## RENDERING
홈 /                   ISR revalidate:300
도서 목록 /books        CSR React Query
도서 상세 /books/[slug] SSR + generateMetadata
큐레이션 /curation/*    ISR revalidate:300
이벤트 /events          ISR revalidate:60
콘텐츠 /content/[slug]  SSR + generateMetadata
관리자 /admin/*         CSR

## 알라딘 API 규칙
CSV 업로드: isbn + stock 2개만 (다른 필드 CSV에 넣지 않음)
도서 정보:  CF bulkCreateBooks에서 알라딘 ItemLookUp API로 자동 수집
표지 이미지: 알라딘 URL → Firebase Storage 다운로드 저장 → 내 URL 사용
구판/절판:  syncBookStatus CF (매일 새벽 2시) 자동 감지
환경변수:   ALADIN_TTB_KEY (functions/.env 서버 전용)

## 정책 요약 (상세: docs/PRD.md)
배송비:    15,000원 이상 무료 / 미만 3,000원
           calculateShippingFee() 사용 (하드코딩 금지)
취소:      shippingStatus=ready 인 경우만 가능
반품:      deliveredAt 7일 이내만 가능
리뷰:      구매 완료(status=paid) 사용자만, 1인 1권 1리뷰
이벤트 신청: 중복 신청 불가, 정원 초과 시 EVENT_FULL

## 완료 보고 형식 (필수)
✅ [Phase N / Task N — 작업명] 완료

생성/수정된 파일:
  - 경로/파일명.ts → 한 줄 설명

구현된 기능:
  - 기능 1
  - 기능 2

TypeScript 오류: 없음

다음 Task: [작업명]
진행하시겠습니까? (Y → 계속 / 수정사항 있으면 알려주세요)
