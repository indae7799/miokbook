📚 AI Task Prompt Library v2.0 (Production Edition)
════════════════════════════════════════════════════
사용법: Master Prompt를 먼저 붙여넣은 뒤, 아래 Task를 하나씩 복사해서 입력합니다.
각 Task는 반드시 하나의 파일 또는 하나의 기능 단위입니다.
════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — 프로젝트 기반
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 1-1] Monorepo 초기화
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Initialize pnpm monorepo structure.

Steps:
1. Create root package.json with pnpm workspace config
2. Create apps/web (Next.js 14), packages/schemas, packages/utils, functions directories
3. Configure TypeScript strict mode for each package
4. Add pnpm-workspace.yaml

Root tsconfig.json:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

Return: directory tree showing all created files.

─────────────────────────
[Task 1-2] Next.js 초기화
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Set up Next.js 14 in apps/web/.

Requirements:
- App Router
- TypeScript strict
- TailwindCSS configured
- ESLint + Prettier
- Create ALL empty placeholder files from PRD Section 4 folder structure
  (빈 파일이라도 경로를 만들어야 AI가 나중에 올바른 위치에 생성함)

Return: apps/web/src/ directory tree.

─────────────────────────
[Task 1-3] .cursorrules 생성
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Create .cursorrules file in project root.

Content should include:
- Tech stack declaration (PRD Section 2)
- Forbidden patterns (any type, localStorage direct access, client-side inventory writes)
- Required patterns (Zod parse, queryKeys factory, min-h-[48px])
- Folder structure reference
- Error response format

This file is read automatically by Cursor on every message.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — 데이터 스키마
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 2-1] Book Schema
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement packages/schemas/src/book.schema.ts

Fields (from PRD Section 6):
  isbn, slug, title, author, description, coverImage,
  listPrice, salePrice, category, status, isActive, createdAt, updatedAt

Rules:
- isbn: regex /^978\d{10}$/
- status: z.enum(['on_sale', 'out_of_print', 'coming_soon', 'old_edition'])
- salePrice validation: must be <= listPrice
- Export: BookSchema, BookStatusEnum, Book type, BookFilters type

BookFilters type (NOT Record<string, any>):
  keyword?: string
  category?: string
  page?: number
  pageSize?: number
  sort?: 'latest' | 'price_asc' | 'price_desc'
  status?: 'on_sale' | 'coming_soon'

Return full file content.

─────────────────────────
[Task 2-2] Order Schema
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement packages/schemas/src/order.schema.ts

Required schemas (from PRD Section 6):
  OrderItemSchema, ShippingAddressSchema, OrderStatusEnum, OrderSchema

Key rules:
- phone regex: /^01[0-9]{8,9}$/
- zipCode regex: /^\d{5}$/
- items: z.array(OrderItemSchema).min(1)
- unitPrice: 결제 시점 가격 스냅샷 (가격 변동 대비)
- expiresAt: Timestamp (pending 만료용)
- Export all schemas and inferred types

─────────────────────────
[Task 2-3] User + CMS Schema
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement packages/schemas/src/user.schema.ts
      and packages/schemas/src/cms.schema.ts

user.schema.ts:
  - UserRoleEnum: z.enum(['customer', 'admin'])
  - UserSchema includes: uid, email, name, phone, role, addresses[]

cms.schema.ts:
  - BannerSchema (id, imageUrl, linkUrl, position, isActive, startDate, endDate, order)
  - BannerPositionEnum: z.enum(['main_hero', 'main_top', 'sidebar'])
  - FeaturedBookSchema (isbn, title, coverImage, priority)
  - CmsHomeSchema

─────────────────────────
[Task 2-4] ErrorCode + Index
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement packages/schemas/src/index.ts

Content:
1. Export all schemas from book, order, user, cms files
2. Define and export ErrorCode const (from PRD Section 9):
   STOCK_SHORTAGE, ORDER_NOT_FOUND, ORDER_EXPIRED,
   PAYMENT_FAILED, PAYMENT_CANCELLED, UNAUTHORIZED,
   FORBIDDEN, VALIDATION_ERROR, INTERNAL_ERROR
3. Define ApiResponse<T> type:
   type ApiResponse<T> = { data: T } | { error: ErrorCode }


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — 인증 & 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 3-1] Firebase Client 초기화
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/lib/firebase/client.ts

Requirements:
- Initialize Firebase with NEXT_PUBLIC_ environment variables
- Export: app, auth, db (Firestore), storage
- Prevent double initialization (check if app already exists)
- TypeScript strict — no any

─────────────────────────
[Task 3-2] Firebase Admin 초기화
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/lib/firebase/admin.ts

Requirements:
- Server-side only (never import in client components)
- Initialize with FIREBASE_ADMIN_* environment variables
- Export: adminApp, adminAuth, adminDb
- Add comment: "// Server-side only — never import in Client Components"

─────────────────────────
[Task 3-3] Cart Store (Zustand)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/store/cart.store.ts

CartItem type:
  isbn: string
  quantity: number
  (가격은 포함하지 않음 — 항상 React Query에서 가져옴)

Functions:
  addItem(item: CartItem): void
  removeItem(isbn: string): void
  updateQuantity(isbn: string, quantity: number): void
  clearCart(): void

Rules:
- Zustand persist middleware
- storage key: 'bookstore-cart'
- skipHydration: true (SSR hydration 에러 방지)
- No server data in this store

─────────────────────────
[Task 3-4] UI Store (Zustand)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/store/ui.store.ts

State:
  isSidebarOpen: boolean
  activeModal: string | null

Functions:
  openModal(id: string): void
  closeModal(): void
  toggleSidebar(): void

─────────────────────────
[Task 3-5] React Query Setup + queryKeys
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/lib/queryKeys.ts

Export queryKeys factory (from PRD Section 7):
  books.all(), books.list(filters: BookFilters), books.detail(slug: string)
  orders.list(userId: string), orders.detail(orderId: string)
  cms.home()

Also implement: apps/web/src/app/(store)/layout.tsx
  - QueryClient provider setup
  - ToastProvider
  - Zustand hydration patch (useEffect for skipHydration)

─────────────────────────
[Task 3-6] Auth Guard Hooks
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/hooks/useAuthGuard.ts
      and apps/web/src/hooks/useAdminGuard.ts

useAuthGuard:
  - Check Firebase Auth state
  - If not logged in → redirect to /login
  - Return: { user, isLoading }

useAdminGuard:
  - Check Firebase Auth + Custom Claims (role === 'admin')
  - If not admin → redirect to /
  - Return: { user, isAdmin, isLoading }

Use in layout.tsx files (not page.tsx) for route protection.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — 공통 컴포넌트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 4-1] SmartLink 컴포넌트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/components/common/SmartLink.tsx

Props: { href: string; children: ReactNode; className?: string }

Logic:
  const isExternal = href.startsWith('http');
  if (isExternal) → <a href={href} target="_blank" rel="noopener noreferrer">
  else → Next.js <Link href={href}>

TypeScript strict. No any.

─────────────────────────
[Task 4-2] EmptyState 컴포넌트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/components/common/EmptyState.tsx

Props:
  title: string
  message: string
  actionButton?: { label: string; onClick: () => void }

Requirements:
- min-h-[48px] on button
- Accessible (aria-label)
- Use in all empty array [] cases throughout the app

─────────────────────────
[Task 4-3] shadcn/ui 기본 컴포넌트 설치
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Install and configure shadcn/ui components.

Install these only (PRD에 없는 것 추가 금지):
  npx shadcn-ui@latest add button
  npx shadcn-ui@latest add input
  npx shadcn-ui@latest add toast
  npx shadcn-ui@latest add dialog
  npx shadcn-ui@latest add badge

After installation, verify all components have min-h-[48px] on interactive elements.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — Admin CMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 5-1] Admin Layout (Auth Guard)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(admin)/admin/layout.tsx

Requirements:
- Use useAdminGuard hook
- Show loading spinner while checking auth
- Redirect to / if not admin
- Admin navigation sidebar

─────────────────────────
[Task 5-2] Admin 도서 관리 페이지
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(admin)/admin/books/page.tsx

Features:
- 도서 목록 조회 (React Query — queryKeys.books.all())
- 인라인 가격 수정
- 재고 수량 수정
- 도서 상태 변경 (on_sale / out_of_print 등)
- 도서 등록 (모달)

API Calls → /api/admin/books/* (Next.js API → Cloud Functions)

Zod validation on all form inputs.

─────────────────────────
[Task 5-3] DragSortableList 컴포넌트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/components/admin/DragSortableList.tsx

Library: @dnd-kit/core, @dnd-kit/sortable

Generic component:
  Props: { items: T[]; onReorder: (newItems: T[]) => void; renderItem: (item: T) => ReactNode }

Use arrayMove helper on onDragEnd.
Used in: /admin/cms page for featuredBooks reordering.

─────────────────────────
[Task 5-4] Admin CMS 페이지 (Drag & Drop)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(admin)/admin/cms/page.tsx

Features:
1. Featured Books: DragSortableList for isbn priority reordering
   → onReorder: immediately updateDoc cms/home.featuredBooks with new priority order
2. Banner Management: list banners with edit/delete

Data flow:
  React Query (queryKeys.cms.home()) → display
  Drag end → updateDoc → React Query invalidate

─────────────────────────
[Task 5-5] ImagePreviewUploader 컴포넌트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/components/admin/ImagePreviewUploader.tsx

Features:
- Select image file → preview with URL.createObjectURL
- Upload to Firebase Storage
- Apply object-fit: cover for preview
- File size limit: 5MB (client-side validation)
- Allowed types: image/jpeg, image/png, image/webp
- Return: download URL after upload

Props: { path: string; onUploadComplete: (url: string) => void }


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 — Storefront
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 6-1] BookCard 컴포넌트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/components/books/BookCard.tsx

Props: { book: Book }

Displays: coverImage (Next/Image), title, author, salePrice, listPrice (취소선)
Button: "장바구니 담기" → useCart().addItem({ isbn, quantity: 1 })

Requirements:
- min-h-[48px] on button
- object-fit: cover on image
- Link to /books/[slug]

─────────────────────────
[Task 6-2] 홈 페이지 (ISR)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(store)/page.tsx

Rendering: ISR with revalidate = 300

Sections:
1. Hero Banner (from cms/home.heroBanners)
2. Featured Books Carousel (from cms/home.featuredBooks → books query)
3. New Arrivals Grid

Data fetching: Server Component → fetch from Firestore directly
               (React Query는 클라이언트 컴포넌트에서만 사용)

─────────────────────────
[Task 6-3] 도서 목록 페이지 (CSR)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(store)/books/page.tsx
      and apps/web/src/hooks/useBookSearch.ts

Rendering: CSR with React Query

useBookSearch hook:
  - queryKeys.books.list(filters)
  - fetch from /api/search
  - filters: BookFilters (keyword, category, page, pageSize, sort)
  - Return: { books, isLoading, totalCount, filters, setFilters }

Page features:
  - Search input with 300ms debounce
  - Category filter
  - Sort dropdown (최신순 / 가격순)
  - BookCard grid
  - Pagination
  - EmptyState when books.length === 0

─────────────────────────
[Task 6-4] 도서 상세 페이지 (SSR)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(store)/books/[slug]/page.tsx

Rendering: SSR (not ISR — 재고 실시간 반영 필요)

Required:
1. generateMetadata function:
   - title: book.title
   - description: book.description (100자 truncate)
   - openGraph: { title, description, images: [{ url: book.coverImage }] }
   - twitter: { card: 'summary_large_image', images: [book.coverImage] }

2. Page content:
   - Book info (coverImage, title, author, salePrice, listPrice)
   - Stock status (inventory/{isbn}.available 조회)
   - "장바구니 담기" button (min-h-[48px])
   - "품절" badge when available === 0

Slug parsing: slug = "title-slug-isbn" → isbn은 마지막 13자리

─────────────────────────
[Task 6-5] 장바구니 페이지
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(store)/cart/page.tsx

Data sources:
  - Cart items: Zustand cart.store (isbn + quantity)
  - Book details: React Query (queryKeys.books.detail per isbn)
  - Price: always from React Query, never from Zustand

Features:
  - List cart items with coverImage, title, price
  - Quantity update (+/-) with min-h-[48px] buttons
  - Remove item
  - Total price calculation
  - "주문하기" button → /checkout

EmptyState when cart is empty.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — 검색
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 7-1] Meilisearch 클라이언트
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/lib/meilisearch.ts

Server-side client:
  host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST
  apiKey: process.env.MEILISEARCH_MASTER_KEY (server only)

Client-side client:
  host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY (read-only)

Export both separately. Mark server client with "// Server-side only" comment.

─────────────────────────
[Task 7-2] Search API Route
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/api/search/route.ts

Steps:
1. Validate query params with Zod (keyword, category, page, pageSize, sort)
2. Rate limit: 10 requests/second per IP using upstash/ratelimit
   (Return 429 if exceeded: { error: 'RATE_LIMIT_EXCEEDED' })
3. Search Meilisearch 'books' index
4. Filter: isActive = true
5. Return: { data: { hits: Book[], totalHits: number } }

─────────────────────────
[Task 7-3] Meilisearch Sync (Cloud Function)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement functions/src/search/syncToMeilisearch.ts

Triggers:
  onDocumentWritten: 'books/{isbn}'

Logic:
  - If deleted → index.deleteDocument(isbn)
  - If created/updated → validate with BookSchema.safeParse
    If valid AND isActive → index.addDocuments([{ id: isbn, ...data }])
    If valid AND NOT isActive → index.deleteDocument(isbn)
    If invalid → log error, do NOT throw (prevents infinite retry)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 8 — 결제
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 8-1] 주문 생성 API + Cloud Function
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/api/order/create/route.ts
      and functions/src/order/createOrder.ts

API Route (Next.js):
1. Verify Firebase Auth token
2. Validate request body with Zod (items: OrderItem[], shippingAddress)
3. Call Cloud Function: createOrder
4. Return { data: { orderId } }

Cloud Function createOrder:
1. Validate inputs
2. Calculate totalPrice from books collection (NOT from client)
3. Create orders/{orderId}: status = 'pending', expiresAt = now + 30min
4. Return orderId

⚠️ 가격은 반드시 서버에서 books 컬렉션을 읽어 계산. 클라이언트 전송 가격 사용 금지.

─────────────────────────
[Task 8-2] 재고 예약 Cloud Function
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement functions/src/inventory/reserveStock.ts

Input: { orderId: string, items: { isbn: string, quantity: number }[] }

Logic (runTransaction — 단일 트랜잭션):
  for each item:
    1. Read inventory/{isbn}
    2. if (stock - reserved) < quantity → throw 'STOCK_SHORTAGE'
    3. reserved += quantity
  Commit transaction

On success: Update orders/{orderId}.status stays 'pending' (결제 대기)
On STOCK_SHORTAGE: Return error — caller must handle

─────────────────────────
[Task 8-3] 결제 확인 API + Cloud Function
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/api/payment/confirm/route.ts
      and functions/src/payment/confirmPayment.ts

API Route:
1. Verify Firebase Auth token
2. Validate: { paymentKey, orderId, amount } with Zod
3. Call Cloud Function: confirmPayment

Cloud Function confirmPayment (runTransaction):
1. Read orders/{orderId} — if status !== 'pending' → throw 'ORDER_NOT_FOUND' (멱등성)
2. Check expiresAt > now — if expired → throw 'ORDER_EXPIRED'
3. Call Toss Payments API: POST https://api.tosspayments.com/v1/payments/confirm
   Headers: Authorization: Basic ${base64(TOSS_SECRET_KEY:)}
   Body: { paymentKey, orderId, amount }
4. On Toss success:
   - inventory: stock -= quantity, reserved -= quantity (per item)
   - orders/{orderId}: status = 'paid', paymentKey = key, paidAt = now
5. On Toss failure:
   - inventory: reserved -= quantity (예약 해제)
   - orders/{orderId}: status = 'failed'
   - throw 'PAYMENT_FAILED'

─────────────────────────
[Task 8-4] 결제 웹훅
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/api/payment/webhook/route.ts

Purpose: Handle Toss Payments webhook for payment cancellation/failure

Steps:
1. Verify webhook secret (Toss 웹훅 시크릿 헤더 검증)
2. Parse event type: PAYMENT_CANCELED or PAYMENT_FAILED
3. Find order by paymentKey
4. If found and status === 'paid':
   - inventory: stock += quantity (재고 복원), reserved unchanged
   - orders/{orderId}: status = 'cancelled'
5. Return 200 (웹훅은 항상 200 반환, 에러는 로깅만)

─────────────────────────
[Task 8-5] Checkout 페이지
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(store)/checkout/page.tsx
      and apps/web/src/app/(store)/checkout/success/page.tsx

checkout/page.tsx:
1. Display order summary (items from cart + prices from React Query)
2. Shipping address form (ShippingAddressSchema validation)
   - phone, zipCode: <input type="tel" inputMode="numeric" pattern="[0-9]*" />
3. On submit:
   - Call POST /api/order/create
   - Call reserveStock (Cloud Function)
   - Initialize Toss Payments SDK with orderId, amount
4. Handle STOCK_SHORTAGE error → show specific item out of stock message

checkout/success/page.tsx:
1. Read orderId from URL query params
2. Fetch order details
3. Display: 주문 완료 메시지, 주문 번호, 배송 예정일
4. clearCart() from Zustand
5. Link to /mypage

─────────────────────────
[Task 8-6] Pending 주문 자동 만료 (Scheduled Function)
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement functions/src/cleanup/expirePendingOrders.ts

Schedule: Every 30 minutes (pubsub schedule)

Logic:
1. Query orders where status === 'pending' AND expiresAt < now
2. For each expired order (runTransaction):
   - inventory: reserved -= quantity (per item)
   - orders/{orderId}: status = 'cancelled'
3. Log count of expired orders


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 9 — SEO & 성능
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 9-1] SEO 전체 점검
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Verify and complete SEO for all public pages.

Checklist:
1. apps/web/src/app/layout.tsx → default metadata (site name, description)
2. books/[slug]/page.tsx → generateMetadata (title, description, og, twitter)
3. Create apps/web/src/app/sitemap.ts → dynamic sitemap from Firestore books
4. Create apps/web/src/app/robots.ts → allow all, disallow /admin

Metadata must include for book pages:
  openGraph.images = [{ url: coverImage, width: 800, height: 600 }]
  twitter.card = 'summary_large_image'


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 10 — 모니터링 & CI/CD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 10-1] Sentry 설정
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Integrate Sentry for error tracking.

Files to create/modify:
  apps/web/sentry.client.config.ts
  apps/web/sentry.server.config.ts
  apps/web/next.config.js (withSentryConfig wrapper)

Track:
  - Frontend JS errors
  - API Route errors (with userId if authenticated)
  - Cloud Function errors (in functions/src/)

Do NOT log: payment keys, user passwords, Firebase admin keys

─────────────────────────
[Task 10-2] GitHub Actions CI/CD
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Create .github/workflows/ci.yml

Pipeline on push to main:
  1. Setup pnpm
  2. pnpm install
  3. pnpm -r typecheck
  4. pnpm -r lint
  5. pnpm -r build
  6. On success: Vercel deploy (via Vercel GitHub Integration — no manual step needed)
  7. On success: firebase deploy --only functions


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 추가 — 인증 페이지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 3-7] 로그인 / 회원가입 페이지
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement apps/web/src/app/(auth)/login/page.tsx
      and apps/web/src/app/(auth)/signup/page.tsx

login/page.tsx:
  - 이메일 + 비밀번호 폼 (Zod validation)
  - Google 로그인 버튼 (Firebase signInWithPopup)
  - 비밀번호 재설정 링크 → Firebase sendPasswordResetEmail
  - 성공 시 이전 페이지 또는 홈으로 redirect
  - min-h-[48px] on all buttons

signup/page.tsx:
  - 이메일, 비밀번호, 비밀번호확인, 이름, 전화번호
  - 비밀번호 정책: 최소 8자, 영문+숫자 조합
    z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
  - 전화번호: type="tel" inputMode="numeric" pattern="[0-9]*"
  - 성공 시 users/{uid} 문서 생성 (role: 'customer')
  - Google 버튼은 로그인 페이지와 동일 컴포넌트 재사용

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 추가 — CSV 도서 대량 등록
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 5-6] CSV 도서 대량 등록
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Add CSV bulk import feature to admin/books/page.tsx
      and implement functions/src/order/bulkCreateBooks.ts

CSV 컬럼 순서 (헤더 필수):
  isbn, title, author, description, listPrice, category, status, stock

UI (admin/books/page.tsx에 버튼 추가):
  1. "CSV 가져오기" 버튼 클릭 → 파일 선택
  2. papaparse로 파싱
  3. 행별 BookSchema.safeParse 검증
  4. 실패 행은 화면에 에러 목록 표시 (업로드 중단 없음)
  5. 성공 행만 Cloud Function: bulkCreateBooks 호출
  6. 완료 후 "성공 N건 / 실패 N건" 토스트 알림

Cloud Function bulkCreateBooks:
  - salePrice = Math.floor(listPrice * 0.9) 자동 계산
  - slug = kebabCase(title) + '-' + isbn 자동 생성
  - books/{isbn} 생성 (이미 존재하면 merge)
  - inventory/{isbn} 생성 (stock 반영, reserved: 0)
  - 배치당 최대 500건 (Firestore 제한)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 8 추가 — 취소 / 반품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 8-7] 주문 취소 Cloud Function
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement functions/src/order/cancelOrder.ts

Input: { orderId: string, userId: string }

Logic (runTransaction):
  1. orders/{orderId} 조회
  2. 검증:
     - userId 일치 확인 (본인 주문만)
     - status === 'paid' 확인
     - shippingStatus === 'ready' 확인 (배송 출발 전만 가능)
  3. 토스 환불 API 호출:
     POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel
     Body: { cancelReason: "고객 취소" }
  4. 환불 성공 시 트랜잭션:
     - inventory: stock += quantity (재고 복원, per item)
     - orders/{orderId}: status = 'cancelled_by_customer', cancelledAt = now
  5. 환불 실패 시: throw 'PAYMENT_FAILED' (재고 복원 안 함)

API Route 추가:
  apps/web/src/app/api/order/cancel/route.ts
  → Firebase Auth 검증 → cancelOrder Cloud Function 호출

─────────────────────────
[Task 8-8] 반품 신청 기능
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement functions/src/order/requestReturn.ts
      and return UI in mypage

Cloud Function requestReturn:
  Input: { orderId: string, userId: string, reason: string }
  Logic:
    1. orders/{orderId} 조회 및 검증:
       - userId 일치
       - status === 'paid'
       - shippingStatus === 'delivered'
       - deliveredAt > 7일 이내 (수령 후 7일 이내만 가능)
    2. orders/{orderId} 업데이트:
       - returnStatus = 'requested'
       - returnReason = reason
       - status = 'return_requested'

반품 불가 조건 (클라이언트에서 사전 안내):
  - 수령 후 7일 초과
  - 도서 훼손 / 오염 (체크박스로 고객 확인)
  - 밑줄 / 메모 흔적
  - 구성품 누락

마이페이지 UI:
  - 주문 상태별 버튼 표시:
    'paid' + shippingStatus='ready'  → "주문 취소" 버튼
    'paid' + shippingStatus='delivered' + 7일 이내  → "반품 신청" 버튼
    'return_requested'  → "반품 신청 완료" 배지 (버튼 없음)
    'cancelled_by_customer'  → "취소 완료" 배지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 추가 — 배송비 계산
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Task 6-6] 배송비 유틸리티 + 장바구니/체크아웃 반영
─────────────────────────
Follow PRD v6 FINAL and AI Master Prompt v2.

Task: Implement packages/utils/src/shipping.ts
      and apply to cart/page.tsx and checkout/page.tsx

shipping.ts:
  export const SHIPPING_FREE_THRESHOLD = 15000;
  export const SHIPPING_FEE = 3000;

  export function calculateShippingFee(totalPrice: number): number {
    return totalPrice >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;
  }

  export function calculateDeliveryDate(orderDate: Date): Date {
    // 영업일 기준 2~3일 (date-fns addBusinessDays 사용)
    // 주말 / 공휴일 제외
  }

cart/page.tsx에 추가:
  - 상품 합계 표시
  - 배송비 표시 (15,000원 미만이면 "3,000원", 이상이면 "무료")
  - "X원 더 담으면 무료배송!" 안내 문구 (threshold - total > 0인 경우)
  - 최종 결제 금액 = 상품 합계 + 배송비

checkout/page.tsx에 추가:
  - 주문 요약에 배송비 항목 표시
  - 결제 금액에 배송비 포함
  - 배송 예정일 표시 (calculateDeliveryDate 사용)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUICK REFERENCE: 대표님 업무 진행 가이드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

새 채팅 시작 방법:
1. AI Master Prompt v2.0 전체 붙여넣기
2. 아래 Phase 컨텍스트 추가:
   "현재 Phase: [번호]. 완료된 Phase: [목록]. 첫 Task 시작해주세요."
3. AI 보고 받으면 "Y" 또는 수정 내용 입력

각 Task 진행 방법:
1. 위에서 해당 Task 블록 전체 복사
2. 현재 채팅에 붙여넣기
3. AI가 코드 생성 → 복사 → 파일에 붙여넣기
4. TypeScript 오류 없으면 "Y" → 다음 Task

Phase 완료 기준:
- 해당 Phase의 모든 Task 완료
- git commit (메시지: "feat: Phase N complete")
- 다음 Phase 시작

문제 발생 시:
"[파일명]에서 오류가 발생했습니다: [오류 내용]. 수정해주세요."
(새 채팅이 아닌 현재 채팅 계속 사용)
