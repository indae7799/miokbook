📋 TASKS — AI Task Prompt Library FINAL
════════════════════════════════════════════════════════
사용법:
  커서 채팅에 "docs/PRD.md 와 docs/TASKS.md 읽고 [Task명] 시작해줘"
  완료 보고 받으면 Y 또는 수정 요청
  Phase 완료 시 git commit 후 다음 Phase 진행
════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — 프로젝트 기반
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 1-1] Monorepo 초기화
─────────────────────────
docs/PRD.md 를 읽고 아래 작업을 수행해줘.

Task: pnpm monorepo 초기화

Steps:
1. 루트 package.json 생성 (pnpm workspace 설정)
2. pnpm-workspace.yaml 생성
3. apps/web, packages/schemas, packages/utils, functions 폴더 생성
4. 각 패키지 package.json 생성
5. 루트 tsconfig.json (strict: true, noImplicitAny: true)

완료 후 PRD Section 22 형식으로 보고해줘.

─────────────────────────
[Task 1-2] Next.js 14 설정
─────────────────────────
docs/PRD.md 를 읽고 아래 작업을 수행해줘.

Task: apps/web Next.js 14 설정

Requirements:
- App Router, TypeScript strict, TailwindCSS
- ESLint + Prettier 설정
- PRD Section 4의 전체 폴더 구조를 빈 파일로 생성
  (경로 자리를 미리 만들어야 나중에 AI가 올바른 위치에 파일 생성)

완료 후 PRD Section 22 형식으로 보고해줘.

─────────────────────────
[Task 1-3] .cursorrules 생성
─────────────────────────
docs/PRD.md 와 .cursorrules 파일을 읽고 확인해줘.
누락된 내용이 있으면 알려줘. 없으면 "이상 없음"으로 보고해줘.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — 데이터 스키마
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 2-1] Book Schema
─────────────────────────
docs/PRD.md Section 6 을 읽고 아래 파일을 구현해줘.

File: packages/schemas/src/book.schema.ts

PRD에 명시된 코드 그대로 구현.
추가로 BookFilters 타입도 포함 (Record<string, any> 절대 금지).

─────────────────────────
[Task 2-2] Order Schema
─────────────────────────
docs/PRD.md Section 6 을 읽고 아래 파일을 구현해줘.

File: packages/schemas/src/order.schema.ts

PRD에 명시된 코드 그대로 구현.
OrderStatusEnum: 7개 상태 모두 포함 (pending, paid, cancelled, failed,
  cancelled_by_customer, return_requested, return_completed)
ShippingStatusEnum: ready, shipped, delivered
OrderSchema: shippingFee, shippingStatus, cancelledAt, returnStatus, returnReason 포함

─────────────────────────
[Task 2-3] User + CMS + Marketing Schema
─────────────────────────
docs/PRD.md Section 6 을 읽고 아래 파일들을 구현해줘.

Files:
  packages/schemas/src/user.schema.ts
  packages/schemas/src/cms.schema.ts
  packages/schemas/src/marketing.schema.ts

PRD에 명시된 코드 그대로 구현.

─────────────────────────
[Task 2-4] Schemas Index + ErrorCode
─────────────────────────
docs/PRD.md Section 6 을 읽고 아래 파일을 구현해줘.

File: packages/schemas/src/index.ts

- 모든 스키마 export
- ErrorCode 상수 (9개)
- ApiResponse<T> 타입


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — 인증 & 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 3-1] Firebase 초기화
─────────────────────────
docs/PRD.md Section 16 을 읽고 아래 파일들을 구현해줘.

Files:
  apps/web/src/lib/firebase/client.ts  (클라이언트용, 중복 초기화 방지)
  apps/web/src/lib/firebase/admin.ts   (서버 전용, "Server-side only" 주석 필수)

환경변수는 PRD Section 16 에 명시된 이름 그대로 사용.

─────────────────────────
[Task 3-2] Zustand Stores
─────────────────────────
docs/PRD.md Section 7 을 읽고 아래 파일들을 구현해줘.

Files:
  apps/web/src/store/cart.store.ts
  apps/web/src/store/ui.store.ts

cart.store 주의사항:
- CartItem에 price 포함 금지 (isbn, quantity만)
- persist middleware, key: 'bookstore-cart'
- skipHydration: true 필수

─────────────────────────
[Task 3-3] React Query + queryKeys
─────────────────────────
docs/PRD.md Section 7 을 읽고 아래 파일을 구현해줘.

File: apps/web/src/lib/queryKeys.ts

PRD에 명시된 queryKeys factory 그대로 구현.
BookFilters 타입은 packages/schemas에서 import.

─────────────────────────
[Task 3-4] Providers Layout
─────────────────────────
docs/PRD.md 를 읽고 아래 파일을 구현해줘.

File: apps/web/src/app/(store)/layout.tsx

- QueryClientProvider 설정
- ToastProvider 포함
- Zustand skipHydration 패치 (useEffect)

─────────────────────────
[Task 3-5] Auth Guard Hooks
─────────────────────────
docs/PRD.md Section 13 을 읽고 아래 파일들을 구현해줘.

Files:
  apps/web/src/hooks/useAuthGuard.ts
  apps/web/src/hooks/useAdminGuard.ts

useAuthGuard: Firebase Auth 확인 → 미로그인 시 /login redirect
useAdminGuard: Firebase Custom Claims role === 'admin' 확인 → 비관리자 시 / redirect

─────────────────────────
[Task 3-6] 로그인 / 회원가입 페이지
─────────────────────────
docs/PRD.md Section 13 을 읽고 아래 파일들을 구현해줘.

Files:
  apps/web/src/app/(auth)/login/page.tsx
  apps/web/src/app/(auth)/signup/page.tsx

login:
  - 이메일+비밀번호 폼 (Zod validation)
  - Google 로그인 버튼 (signInWithPopup)
  - 비밀번호 재설정 링크
  - 성공 시 이전 페이지 또는 홈 redirect

signup:
  - 이메일, 비밀번호, 비밀번호확인, 이름, 전화번호
  - 비밀번호 정책: PRD 명시된 regex
  - 전화번호: type="tel" inputMode="numeric"
  - 성공 시 users/{uid} 생성 (role: 'customer')
  - Google 버튼은 login과 동일 컴포넌트 재사용


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — 공통 컴포넌트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 4-1] SmartLink
─────────────────────────
docs/PRD.md Section 17 을 읽고 구현해줘.
File: apps/web/src/components/common/SmartLink.tsx

─────────────────────────
[Task 4-2] EmptyState
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/components/common/EmptyState.tsx

Props: title, message, actionButton?: { label, onClick }
button에 min-h-[48px] 적용.

─────────────────────────
[Task 4-3] formatter.ts
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: packages/utils/src/formatter.ts

함수:
  formatPrice(price: number): string  → "15,000원"
  formatDate(date: Date): string      → "2025. 3. 15"
  truncateText(text: string, maxLength: number): string

─────────────────────────
[Task 4-4] shadcn/ui 설치
─────────────────────────
docs/PRD.md 를 읽고 아래 컴포넌트만 설치해줘.

npx shadcn-ui@latest add button input toast dialog badge

설치 후 모든 interactive 요소에 min-h-[48px] 적용 확인.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — Admin CMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 5-1] Admin Layout + Guard
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/layout.tsx

useAdminGuard 사용, 로딩 스피너, 비관리자 redirect.
Admin 네비게이션 사이드바 포함 (books, orders, cms, marketing 링크).

─────────────────────────
[Task 5-2] Admin 대시보드
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/page.tsx

표시 항목:
  오늘 주문 수, 오늘 매출, 재고 부족 도서 목록 (stock < 5),
  최근 주문 5건

데이터: React Query로 Firestore 직접 조회.

─────────────────────────
[Task 5-3] Admin 도서 관리 + CSV 등록
─────────────────────────
docs/PRD.md Section 17 을 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/books/page.tsx

기능:
  1. 도서 목록 (React Query)
  2. 인라인 재고/상태 수정
  3. CSV/엑셀 업로드 후 "자료 수집" 버튼
     - 1단계: 파일 업로드 (헤더 isbn, stock 만)
     - 2단계: "자료 수집" 버튼 클릭 → papaparse 파싱 → isbn 정규화·검증 → CF bulkCreateBooks 호출
     - 알라딘 API로 표지·소개·정가 등 수집, 수량은 재고에 반영
  4. 성공/실패 건수 토스트
     (알라딘 응답 없는 isbn은 실패 목록에 표시)

CF bulkCreateBooks 구현:
  File: functions/src/order/bulkCreateBooks.ts

  isbn별 처리 (PRD Section 17 흐름 그대로):
  1. 알라딘 ItemLookUp API 호출
     GET https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx
       ?ttbkey={ALADIN_TTB_KEY}&itemIdType=ISBN13&ItemId={isbn}
       &output=js&Version=20131101&Cover=Big
  2. title, author, publisher, description,
     cover URL, listPrice, publishDate, category, itemStatus 추출
  3. cover URL → Firebase Storage 다운로드 저장
     경로: books/{isbn}/cover.jpg
     내 Storage URL → coverImage 필드 저장
     ※ 알라딘 URL 직접 저장 절대 금지
  4. itemStatus → status 매핑 (PRD Section 17 참조)
  5. salePrice = Math.floor(listPrice * 0.9)
  6. slug = kebabCase(title) + '-' + isbn
  7. books/{isbn} + inventory/{isbn} 동시 생성
  8. 알라딘 응답 없으면 에러 목록 추가 (중단 없음)

환경변수: ALADIN_TTB_KEY (functions/.env)

─────────────────────────
[Task 5-3-B] 구판/절판 자동 감지 Scheduled Function
─────────────────────────
docs/PRD.md Section 17 을 읽고 구현해줘.
File: functions/src/cleanup/syncBookStatus.ts

Schedule: 매일 새벽 2시 (pubsub schedule)

흐름:
  1. books isActive=true 전체 조회
  2. isbn 배열 50개씩 배치 분할
  3. 배치별 알라딘 ItemLookUp API 호출
  4. 절판/품절 감지 시:
       books/{isbn}.status  = 'out_of_print'
       books/{isbn}.isActive = false
       → syncToMeilisearch trigger → Meilisearch 자동 제거
  5. 처리 건수 Google Cloud Logging 기록

─────────────────────────
[Task 5-4] Admin 주문 관리
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/orders/page.tsx

기능:
  주문 목록 (status 필터)
  배송 상태 변경 (ready → shipped → delivered)
  반품 신청 목록 확인 및 반품 완료 처리

─────────────────────────
[Task 5-5] DragSortableList 컴포넌트
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/components/admin/DragSortableList.tsx

라이브러리: @dnd-kit/core, @dnd-kit/sortable
Generic: Props { items: T[], onReorder: (newItems: T[]) => void, renderItem: (item: T) => ReactNode }
onDragEnd에서 arrayMove 사용.

─────────────────────────
[Task 5-6] Admin CMS 페이지
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/cms/page.tsx

기능:
  FeaturedBooks: DragSortableList → onReorder 즉시 updateDoc cms/home
  React Query invalidate 후 재조회

─────────────────────────
[Task 5-7] Admin Marketing 페이지
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/marketing/page.tsx

기능: 배너 목록, 배너 추가/수정/삭제, 팝업 관리
ImagePreviewUploader 컴포넌트 사용

─────────────────────────
[Task 5-8] ImagePreviewUploader + InternalLinkPicker
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.

Files:
  apps/web/src/components/admin/ImagePreviewUploader.tsx
  apps/web/src/components/admin/InternalLinkPicker.tsx

ImagePreviewUploader:
  Props: { storagePath: string; onUploadComplete: (url: string) => void }
  - URL.createObjectURL 미리보기
  - 최대 5MB, jpeg/png/webp만 허용
  - Firebase Storage 업로드 → URL 반환

InternalLinkPicker:
  Props: { value: string; onChange: (url: string) => void }
  - 내부 경로 선택 드롭다운 (홈, 도서목록, 특정 도서 등)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 — Storefront
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 6-1] shipping.ts
─────────────────────────
docs/PRD.md Section 11 을 읽고 구현해줘.
File: packages/utils/src/shipping.ts

PRD에 명시된 코드 그대로 구현.
calculateShippingFee, calculateDeliveryDate (date-fns addBusinessDays).

─────────────────────────
[Task 6-2] BookCard + BookCarousel
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.

Files:
  apps/web/src/components/books/BookCard.tsx
  apps/web/src/components/books/BookCarousel.tsx

BookCard:
  Props: { book: Book }
  - coverImage (Next/Image, object-fit: cover)
  - title, author, salePrice, listPrice(취소선)
  - "장바구니 담기" 버튼 (min-h-[48px])
  - /books/[slug] 링크

BookCarousel:
  Swiper 래퍼, BookCard 수평 스크롤

BookDetail:
  Props: { book: Book; available: number }
  - 도서 상세 정보 표시 전용 Presentational 컴포넌트
  - books/[slug]/page.tsx 에서 사용
  - 재고 표시, 장바구니 담기 버튼, 품절 처리 포함

─────────────────────────
[Task 6-3] 홈 페이지 (ISR)
─────────────────────────
docs/PRD.md Section 8 (HOME PAGE UX SPEC) 을 읽고 구현해줘.
File: apps/web/src/app/(store)/page.tsx

Rendering: ISR revalidate: 300
Sections:
  1. Hero Banner (cms/home.heroBanners)
  2. Featured Books Carousel (cms/home.featuredBooks)
  3. 신간 도서 Grid

Server Component에서 Firestore 직접 조회 (React Query 아님).

─────────────────────────
[Task 6-4] useBookSearch hook
─────────────────────────
docs/PRD.md Section 7 을 읽고 구현해줘.
File: apps/web/src/hooks/useBookSearch.ts

- queryKeys.books.list(filters) 사용
- fetch from /api/search
- filters: BookFilters 타입
- 300ms debounce
- Return: { books, isLoading, totalCount, filters, setFilters }

─────────────────────────
[Task 6-5] 도서 목록 페이지 (CSR)
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(store)/books/page.tsx

- useBookSearch hook 사용
- 검색창 (debounce), 카테고리 필터, 정렬 드롭다운
- BookCard grid
- Pagination
- EmptyState (books.length === 0)

─────────────────────────
[Task 6-6] 도서 상세 페이지 (SSR)
─────────────────────────
docs/PRD.md Section 9 (BOOK DETAIL PAGE UX SPEC) 을 읽고 구현해줘.
File: apps/web/src/app/(store)/books/[slug]/page.tsx

Rendering: SSR
- generateMetadata: title, description, openGraph, twitter (PRD 명시 항목 모두)
- slug에서 isbn 추출: 마지막 13자리
- 재고 표시 (inventory.available)
- "장바구니 담기" 버튼 (품절 시 disabled)

─────────────────────────
[Task 6-7] useCart hook
─────────────────────────
docs/PRD.md Section 7 을 읽고 구현해줘.
File: apps/web/src/hooks/useCart.ts

cart.store.ts 의 액션을 감싸는 훅.
각 아이템의 Book 데이터는 React Query로 가져옴 (price 계산용).
Return: { items, enrichedItems, addItem, removeItem, updateQuantity, clearCart, totalPrice, shippingFee }

─────────────────────────
[Task 6-8] 장바구니 페이지
─────────────────────────
docs/PRD.md Section 11 을 읽고 구현해줘.
File: apps/web/src/app/(store)/cart/page.tsx

- useCart hook 사용
- 가격은 항상 React Query에서 (Zustand 저장 가격 사용 금지)
- 수량 변경 +/- 버튼 (min-h-[48px])
- 배송비 표시 (calculateShippingFee 사용)
- "X원 더 담으면 무료배송!" 안내
- EmptyState (장바구니 비었을 때)
- "주문하기" 버튼 → /checkout

─────────────────────────
[Task 6-9] 마이페이지
─────────────────────────
docs/PRD.md Section 12 을 읽고 구현해줘.

Files:
  apps/web/src/app/(store)/mypage/layout.tsx  (useAuthGuard 적용)
  apps/web/src/app/(store)/mypage/page.tsx

- 주문 목록 (React Query queryKeys.orders.list)
- 주문 상태별 버튼:
  'paid' + shippingStatus='ready'           → "주문 취소" 버튼
  'paid' + shippingStatus='delivered' + 7일 → "반품 신청" 버튼
  'cancelled_by_customer'                   → "취소 완료" 배지
  'return_requested'                        → "반품 신청 완료" 배지


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — 검색
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 7-1] Meilisearch 클라이언트
─────────────────────────
docs/PRD.md Section 10 을 읽고 구현해줘.
File: apps/web/src/lib/meilisearch.ts

서버용 (MEILISEARCH_MASTER_KEY): "Server-side only" 주석 필수
클라이언트용 (NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY): 읽기 전용
둘 다 export.

─────────────────────────
[Task 7-2] Search API Route
─────────────────────────
docs/PRD.md Section 10 을 읽고 구현해줘.
File: apps/web/src/app/api/search/route.ts

1. Zod로 query params 검증 (BookFilters 타입)
2. Rate Limit: upstash/ratelimit, 동일 IP 초당 10회 → 429 반환
3. Meilisearch 'books' index 검색
4. isActive = true 필터 적용
5. Return: { data: { hits: Book[], totalHits: number } }

─────────────────────────
[Task 7-3] Meilisearch Sync (Cloud Function)
─────────────────────────
docs/PRD.md Section 10 을 읽고 구현해줘.
File: functions/src/search/syncToMeilisearch.ts

Trigger: onDocumentWritten 'books/{isbn}'
- 삭제: deleteDocument(isbn)
- 생성/수정 + isActive=true: addDocuments
- 생성/수정 + isActive=false: deleteDocument
- Zod parse 실패 시: 에러 로그만 (throw 금지 — 무한 재시도 방지)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 8 — 결제 / 취소 / 반품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 8-1] 주문 생성
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.

Files:
  apps/web/src/app/api/order/create/route.ts
  functions/src/order/createOrder.ts

API Route: Auth 토큰 검증 → CF 호출
CF createOrder:
  - 가격을 books 컬렉션에서 직접 계산 (클라이언트 가격 신뢰 금지)
  - shippingFee = calculateShippingFee(totalPrice)
  - orders 생성: status=pending, expiresAt=now+30분

─────────────────────────
[Task 8-2] 재고 예약 CF
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.
File: functions/src/inventory/reserveStock.ts

runTransaction:
  for each item: if (stock - reserved) < quantity → throw STOCK_SHORTAGE
  reserved += quantity

─────────────────────────
[Task 8-3] Checkout 페이지
─────────────────────────
docs/PRD.md Section 8, 11 을 읽고 구현해줘.
File: apps/web/src/app/(store)/checkout/page.tsx

1. 주문 요약 (cart items + React Query 가격)
2. 배송지 폼 (ShippingAddressSchema 검증)
   전화/우편번호: type="tel" inputMode="numeric"
3. 배송비 포함 최종 금액
4. 배송 예정일 (calculateDeliveryDate)
5. 결제 버튼:
   → POST /api/order/create → reserveStock → 토스 결제창
6. STOCK_SHORTAGE 시 해당 도서 품절 안내

─────────────────────────
[Task 8-4] 결제 확인 CF
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.

Files:
  apps/web/src/app/api/payment/confirm/route.ts
  functions/src/payment/confirmPayment.ts

CF confirmPayment (runTransaction):
  1. orders 상태 pending 확인 (멱등성)
  2. expiresAt > now 확인
  3. 토스 결제 승인 API 호출
  4. 성공: stock -= qty, reserved -= qty, status = 'paid'
  5. 실패: reserved -= qty, status = 'failed'

─────────────────────────
[Task 8-5] 결제 완료 페이지
─────────────────────────
docs/PRD.md 를 읽고 구현해줘.
File: apps/web/src/app/(store)/checkout/success/page.tsx

- URL query params에서 orderId 읽기
- 주문 상세 조회 (React Query)
- 주문 완료 메시지, 주문번호, 배송 예정일 표시
- clearCart() 호출
- 마이페이지 링크

─────────────────────────
[Task 8-6] 결제 웹훅
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.
File: apps/web/src/app/api/payment/webhook/route.ts

- 토스 웹훅 시크릿 헤더 검증
- PAYMENT_CANCELED / PAYMENT_FAILED 처리
- paymentKey로 주문 조회 → 재고 복원 + status 업데이트
- 항상 200 반환 (에러는 로그만)

─────────────────────────
[Task 8-7] Pending 주문 자동 만료
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.
File: functions/src/cleanup/expirePendingOrders.ts

Schedule: pubsub, 매 30분
status=pending AND expiresAt < now → reserved 해제, status=cancelled
처리 건수 로그 출력

─────────────────────────
[Task 8-8] 주문 취소 CF
─────────────────────────
docs/PRD.md Section 8, 12 를 읽고 구현해줘.

Files:
  apps/web/src/app/api/order/cancel/route.ts
  functions/src/order/cancelOrder.ts

조건: status=paid AND shippingStatus=ready
① 토스 환불 API 호출
② 성공: stock += qty, status=cancelled_by_customer
③ 실패: throw PAYMENT_FAILED (재고 복원 안 함)

─────────────────────────
[Task 8-9] 반품 신청 CF
─────────────────────────
docs/PRD.md Section 12 를 읽고 구현해줘.
File: functions/src/order/requestReturn.ts

조건: status=paid AND shippingStatus=delivered AND 7일 이내
→ returnStatus=requested, status=return_requested
불가 조건 위반 시 적절한 ErrorCode throw


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 9 — SEO & 성능
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 9-1] SEO 전체 구현
─────────────────────────
docs/PRD.md Section 22 (SEO) 을 읽고 구현해줘.

Files:
  apps/web/src/app/layout.tsx          (기본 metadata)
  apps/web/src/app/sitemap.ts          (Firestore 동적 생성)
  apps/web/src/app/robots.ts           (/admin disallow)

books/[slug]/page.tsx generateMetadata 점검:
  title, description, openGraph.images, twitter.card 모두 포함 확인


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 10 — 모니터링 & CI/CD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 10-1] Sentry 설정
─────────────────────────
docs/PRD.md Section 20 을 읽고 구현해줘.

Files:
  apps/web/sentry.client.config.ts
  apps/web/sentry.server.config.ts
  apps/web/next.config.js  (withSentryConfig 래퍼)

결제키/비밀번호/Firebase admin 키 절대 로그에 포함하지 말 것.

─────────────────────────
[Task 10-2] GitHub Actions CI/CD
─────────────────────────
docs/PRD.md Section 20 을 읽고 구현해줘.
File: .github/workflows/ci.yml

Pipeline:
  pnpm install → typecheck → lint → build
  → Vercel 자동 배포 (GitHub Integration)
  → firebase deploy --only functions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — 큐레이션 & 콘텐츠 & 이벤트 페이지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 7-4] 홈 섹션 컴포넌트 전체
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.

Files (apps/web/src/components/home/):
  HeroCarousel.tsx      Swiper, cms/home.heroBanners
  QuickNav.tsx          아이콘 기반 빠른 탐색, 모바일 horizontal scroll
  BestsellerSection.tsx Top 10 순위 리스트
  FeaturedCuration.tsx  독립서점 추천, recommendationText 포함
  MonthlyPick.tsx       이달의 책, large feature card
  NewBooksGrid.tsx      grid 2 column, BookCard
  CategoryGrid.tsx      icon card grid, /books?category= 링크
  ThemeCuration.tsx     테마 큐레이션, horizontal book list
  EventsSection.tsx     EventCard 3개
  ContentSection.tsx    ArticleCard 3개
  AboutBookstore.tsx    서점 소개, CTA 버튼

각 컴포넌트는 Props로 데이터를 받는 Presentational 컴포넌트.
데이터 페치는 page.tsx Server Component에서 수행.

─────────────────────────
[Task 7-5] EventCard + ArticleCard 컴포넌트
─────────────────────────
docs/PRD.md Section 8 을 읽고 구현해줘.

Files:
  apps/web/src/components/events/EventCard.tsx
  apps/web/src/components/content/ArticleCard.tsx

EventCard Props: { event: Event }
  이미지, 날짜(date-fns format), 제목, 참여 버튼(min-h-[48px])
  링크: /events/[id]

ArticleCard Props: { article: Article }
  thumbnailUrl, type(한글), title
  링크: /content/[slug]

─────────────────────────
[Task 7-6] 큐레이션 페이지들
─────────────────────────
docs/PRD.md Section 23 을 읽고 구현해줘.

Files:
  apps/web/src/app/(store)/curation/page.tsx        큐레이션 홈 (ISR)
  apps/web/src/app/(store)/curation/md/page.tsx     MD 추천
  apps/web/src/app/(store)/curation/monthly/page.tsx 이달의 책
  apps/web/src/app/(store)/curation/[id]/page.tsx   테마 큐레이션 상세

데이터: cms/home (featuredBooks, monthlyPick, themeCurations)

─────────────────────────
[Task 7-7] 이벤트 페이지들
─────────────────────────
docs/PRD.md Section 14 을 읽고 구현해줘.

Files:
  apps/web/src/app/(store)/events/page.tsx       이벤트 목록 (ISR revalidate:60)
  apps/web/src/app/(store)/events/[id]/page.tsx  이벤트 상세

이벤트 목록: type 필터 (전체/북콘서트/저자강연/독서모임)
이벤트 상세: 상세 정보 + 신청 버튼 + 잔여 인원 표시

─────────────────────────
[Task 7-8] 콘텐츠 페이지들
─────────────────────────
docs/PRD.md Section 22 을 읽고 구현해줘.

Files:
  apps/web/src/app/(store)/content/page.tsx        콘텐츠 목록 (ISR)
  apps/web/src/app/(store)/content/[slug]/page.tsx 콘텐츠 상세 (SSR + generateMetadata)

콘텐츠 상세 generateMetadata:
  title: article.title
  openGraph.images: [{ url: article.thumbnailUrl }]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 10 — 리뷰 & 이벤트 신청
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 10-3] 리뷰 시스템
─────────────────────────
docs/PRD.md Section 15 을 읽고 구현해줘.

Files:
  functions/src/review/createReview.ts
  apps/web/src/app/api/review/create/route.ts

CF createReview (runTransaction):
  1. orders에서 구매 이력 확인 (bookIsbn + userId)
  2. reviews 중복 확인 (1인 1권 1리뷰)
  3. reviews/{reviewId} 생성
  4. books/{isbn}.rating 재계산, reviewCount += 1

UI: books/[slug]/page.tsx 하단 리뷰 섹션
  - 리뷰 목록 (React Query books.reviews(isbn))
  - 구매 완료 사용자만 작성 폼 표시

─────────────────────────
[Task 10-4] 이벤트 신청 시스템
─────────────────────────
docs/PRD.md Section 14 을 읽고 구현해줘.

Files:
  functions/src/events/registerEvent.ts
  apps/web/src/app/api/events/register/route.ts

CF registerEvent (runTransaction):
  1. 중복 신청 확인 (userId + eventId)
  2. registeredCount >= capacity → throw EVENT_FULL
  3. eventRegistrations 생성
  4. events/{eventId}.registeredCount += 1

UI: events/[id]/page.tsx 신청 버튼
  - 로그인 필요 (useAuthGuard)
  - 정원 초과 시 "신청 마감" 배지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 추가 — Admin 이벤트/콘텐츠 관리
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 5-9] Admin 이벤트 관리
─────────────────────────
docs/PRD.md Section 14 을 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/events/page.tsx

기능: 이벤트 등록/수정/삭제, 참가자 목록 조회

─────────────────────────
[Task 5-10] Admin 콘텐츠 관리
─────────────────────────
docs/PRD.md Section 16 을 읽고 구현해줘.
File: apps/web/src/app/(admin)/admin/content/page.tsx

기능: 콘텐츠(인터뷰/서점이야기) 등록/수정/삭제, 발행 여부 토글
마크다운 에디터 (shadcn/ui Textarea 활용)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 13 — BNK API 연동 (장기 플랜 — BNK API 키 발급 후 진행)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 이 Phase는 BNK API 인증키 발급 완료 전까지 착수하지 않는다.
   현재 개발(Phase 1~12)과 완전히 독립된 별도 Phase다.

[Task 13-1] BNK API 검색 제안 엔드포인트
─────────────────────────
docs/PRD.md Section 11-B 를 읽고 구현해줘.

File: apps/web/src/app/api/search/suggest/route.ts

요구사항:
- 기존 /api/search 와 완전히 분리된 엔드포인트
- BNK API만 호출 (Meilisearch 호출 금지)
- Rate Limit: 동일 IP 초당 3회 (기존 검색과 별도 제한)
- BNK API 응답 지연/실패 시 빈 배열 반환 (에러 전파 금지)
- 환경변수: BNK_API_KEY (서버 전용)

반환 형식:
  { data: { suggestions: BNKBook[] } }
  BNKBook: { isbn, title, author, publisher, coverUrl }

─────────────────────────
[Task 13-2] 검색 결과 UI — BNK 제안 섹션 추가
─────────────────────────
docs/PRD.md Section 11-B 를 읽고 구현해줘.

수정 파일: apps/web/src/app/(store)/books/page.tsx
           apps/web/src/hooks/useBookSearch.ts

작동 방식 (PRD Section 11-B 우선순위 원칙 엄수):
  1. Meilisearch 결과 즉시 표시 (기존 동작 유지)
  2. 결과 수 < 3건인 경우에만 /api/search/suggest 비동기 호출
  3. BNK 제안 결과는 메인 결과 아래 별도 섹션으로만 표시
     제목: "이런 책도 있어요"
  4. BNK 응답 없으면 해당 섹션 숨김 (메인 결과 영향 없음)

⚠️ 두 결과를 하나의 리스트에 섞는 것 절대 금지
⚠️ BNK API 로딩 상태가 메인 검색 결과 로딩에 영향을 주면 안 됨
