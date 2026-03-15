📘 온라인 독립서점 플랫폼 — PRD FINAL
AI-Native Production Blueprint

════════════════════════════════════════════════════════
⚠️ AI AGENT: 이 파일이 유일한 설계 원본입니다.
   다른 버전의 PRD는 모두 무시하세요.
════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRODUCT GOAL & VISION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

서비스 비전
  단순한 온라인 서점이 아니라
  독립서점의 경험을 온라인으로 확장한 플랫폼

  "책을 판매하는 플랫폼이 아니라 책을 발견하는 공간을 만든다"

핵심 가치
  Discovery  (발견)     — 탐색을 통한 새로운 책과의 만남
  Curation   (큐레이션) — MD 추천, 이달의 책, 테마 기획전
  Experience (공간경험) — 독립서점 감성의 온라인 재현
  Community  (커뮤니티) — 이벤트, 북콘서트, 저자 강연

UX 흐름 (모든 페이지 설계 기준)
  감성 → 탐색 → 발견 → 구매

구매 흐름 2가지
  검색형: 검색 → 구매
  발견형: 탐색 → 발견 → 구매

사용자 유형
  독서 애호가  : 자주 구매, 추천/큐레이션 콘텐츠 관심
  일반 사용자  : 필요 시 구매, 검색 중심
  이벤트 참여자: 북콘서트, 저자 강연, 독서 모임 참여

서비스 구성 (5개 영역)
  1. 사용자 UX      — 홈, 도서, 큐레이션, 검색, 마이페이지
  2. 커머스 시스템  — 장바구니, 결제, 재고, 배송, 취소/반품
  3. 콘텐츠 시스템  — 작가 인터뷰, 출판 이야기, 서점 이야기
  4. 큐레이션 시스템— MD 추천, 이달의 책, 테마 큐레이션, 이벤트
  5. 관리자 CMS     — 도서/재고/배너/큐레이션/이벤트/주문 관리

성능 목표
  TTFB < 500ms
  검색 응답 < 150ms
  결제 성공률 > 99.9%
  Lighthouse Score > 90

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. TECH STACK (고정 — 변경 절대 금지)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend     : Next.js 14 (App Router) + TypeScript strict
Styling      : TailwindCSS + shadcn/ui
Client State : Zustand (persist middleware)
Server State : @tanstack/react-query v5
Validation   : Zod v3
Auth         : Firebase Auth (이메일+비밀번호, Google OAuth)
               ※ 네이버 로그인은 추후 추가 (커스텀 토큰 방식)
Database     : Firestore
Storage      : Firebase Cloud Storage
Functions    : Firebase Cloud Functions v2 (Node 20)
Search       : Meilisearch Cloud
Payments     : Toss Payments v2
Hosting      : Vercel (Frontend) + Firebase (Backend)
Monitoring   : Sentry + GA4 + Vercel Analytics
Package Mgr  : pnpm (workspace)

허용 라이브러리 (이것만 사용)
  next, react, typescript, tailwindcss, zod
  zustand, @tanstack/react-query
  firebase, firebase-admin
  meilisearch
  @dnd-kit/core, @dnd-kit/sortable
  papaparse (CSV 파싱)
  date-fns (날짜 계산)
  swiper (캐러셀)
  shadcn/ui 컴포넌트
  sentry/nextjs
  upstash/ratelimit (검색 API Rate Limit)
  node-fetch (Cloud Functions에서 알라딘 API 호출용)

금지 라이브러리
  Redux / MobX / Recoil
  Prisma / Supabase / GraphQL
  axios (fetch 사용)
  moment.js (date-fns 사용)
  any TypeScript 타입

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SYSTEM ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Client (Browser)
       ↓
  Next.js App Router  ←→  Vercel Edge CDN
       ↓
  Next.js API Routes  (Gateway — 인증 검증만 수행)
       ↓
  Firebase Cloud Functions  (모든 비즈니스 로직)
       ↓
  Firestore  ←→  Search Sync Trigger  →  Meilisearch

이미지: Cloud Storage → Vercel Image Optimization
CDN:   Vercel Edge (정적 자산)

Layer 역할
  Next.js API Routes  : 요청 수신, Auth 토큰 검증, CF 호출
  Cloud Functions     : 트랜잭션, 재고, 결제, 취소, 반품
  Firestore           : 데이터 영속성
  Meilisearch         : 검색 전용 (Firestore trigger 자동 동기화)

⚠️ inventory / orders / payments Firestore 쓰기는
   반드시 Cloud Functions만. Client SDK 쓰기 절대 금지.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SITEMAP & REPOSITORY STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

사이트맵
  /                       홈 (ISR)
  /books                  도서 목록 (CSR)
  /books/[slug]           도서 상세 (SSR)
  /curation               큐레이션 홈 (ISR)
  /curation/md            MD 추천
  /curation/monthly       이달의 책
  /curation/[id]          테마 큐레이션 상세
  /events                 이벤트 목록 (ISR)
  /events/[id]            이벤트 상세
  /content                콘텐츠 목록 (ISR)
  /content/[slug]         콘텐츠 상세 (SSR — SEO)
  /cart                   장바구니
  /checkout               결제
  /checkout/success       결제 완료
  /mypage                 마이페이지 (Auth Guard)
  /login                  로그인
  /signup                 회원가입
  /admin/*                관리자 (Admin Guard)

폴더 구조
root/
├── .cursorrules
├── docs/
│   ├── PRD.md
│   └── TASKS.md
├── apps/
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── (store)/
│           │   │   ├── layout.tsx              Providers (RQ, Toast)
│           │   │   ├── page.tsx                홈 (ISR revalidate:300)
│           │   │   ├── books/
│           │   │   │   ├── page.tsx            도서 목록 (CSR)
│           │   │   │   └── [slug]/page.tsx     도서 상세 (SSR)
│           │   │   ├── curation/
│           │   │   │   ├── page.tsx            큐레이션 홈
│           │   │   │   ├── md/page.tsx         MD 추천
│           │   │   │   ├── monthly/page.tsx    이달의 책
│           │   │   │   └── [id]/page.tsx       테마 큐레이션 상세
│           │   │   ├── events/
│           │   │   │   ├── page.tsx            이벤트 목록
│           │   │   │   └── [id]/page.tsx       이벤트 상세
│           │   │   ├── content/
│           │   │   │   ├── page.tsx            콘텐츠 목록
│           │   │   │   └── [slug]/page.tsx     콘텐츠 상세
│           │   │   ├── cart/page.tsx
│           │   │   ├── checkout/
│           │   │   │   ├── page.tsx
│           │   │   │   └── success/page.tsx
│           │   │   └── mypage/
│           │   │       ├── layout.tsx          Auth Guard
│           │   │       └── page.tsx
│           │   ├── (admin)/
│           │   │   └── admin/
│           │   │       ├── layout.tsx          Admin Guard
│           │   │       ├── page.tsx            대시보드
│           │   │       ├── books/page.tsx      도서/재고/CSV
│           │   │       ├── orders/page.tsx     주문/반품 관리
│           │   │       ├── cms/page.tsx        추천도서 D&D
│           │   │       ├── marketing/page.tsx  배너/팝업
│           │   │       ├── events/page.tsx     이벤트 관리
│           │   │       └── content/page.tsx    콘텐츠 관리
│           │   ├── (auth)/
│           │   │   ├── login/page.tsx
│           │   │   └── signup/page.tsx
│           │   └── api/
│           │       ├── search/route.ts
│           │       ├── order/
│           │       │   ├── create/route.ts
│           │       │   └── cancel/route.ts
│           │       └── payment/
│           │           ├── confirm/route.ts
│           │           └── webhook/route.ts
│           ├── components/
│           │   ├── common/
│           │   │   ├── SmartLink.tsx
│           │   │   ├── EmptyState.tsx
│           │   │   └── ToastProvider.tsx
│           │   ├── books/
│           │   │   ├── BookCard.tsx
│           │   │   ├── BookCarousel.tsx
│           │   │   └── BookDetail.tsx
│           │   ├── home/
│           │   │   ├── HeroCarousel.tsx
│           │   │   ├── QuickNav.tsx
│           │   │   ├── BestsellerSection.tsx
│           │   │   ├── FeaturedCuration.tsx
│           │   │   ├── MonthlyPick.tsx
│           │   │   ├── NewBooksGrid.tsx
│           │   │   ├── CategoryGrid.tsx
│           │   │   ├── ThemeCuration.tsx
│           │   │   ├── EventsSection.tsx
│           │   │   ├── ContentSection.tsx
│           │   │   └── AboutBookstore.tsx
│           │   ├── events/
│           │   │   └── EventCard.tsx
│           │   ├── content/
│           │   │   └── ArticleCard.tsx
│           │   └── admin/
│           │       ├── DragSortableList.tsx
│           │       ├── ImagePreviewUploader.tsx
│           │       └── InternalLinkPicker.tsx
│           ├── hooks/
│           │   ├── useAuthGuard.ts
│           │   ├── useAdminGuard.ts
│           │   ├── useCart.ts
│           │   └── useBookSearch.ts
│           ├── store/
│           │   ├── cart.store.ts
│           │   └── ui.store.ts
│           └── lib/
│               ├── firebase/
│               │   ├── client.ts
│               │   └── admin.ts
│               ├── queryKeys.ts
│               └── meilisearch.ts
│
├── packages/
│   ├── schemas/
│   │   └── src/
│   │       ├── book.schema.ts
│   │       ├── order.schema.ts
│   │       ├── user.schema.ts
│   │       ├── cms.schema.ts
│   │       ├── event.schema.ts
│   │       ├── review.schema.ts
│   │       ├── content.schema.ts
│   │       └── index.ts
│   └── utils/
│       └── src/
│           ├── formatter.ts
│           └── shipping.ts
│
└── functions/
    └── src/
        ├── index.ts
        ├── order/
        │   ├── createOrder.ts
        │   ├── cancelOrder.ts
        │   ├── requestReturn.ts
        │   └── bulkCreateBooks.ts
        ├── inventory/
        │   ├── reserveStock.ts
        │   └── commitStock.ts
        ├── payment/
        │   └── confirmPayment.ts
        ├── search/
        │   └── syncToMeilisearch.ts
        └── cleanup/
            ├── expirePendingOrders.ts
            └── syncBookStatus.ts       (알라딘 구판/절판 자동 감지, 매일)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. DATABASE SCHEMA (Firestore)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[books/{isbn}]
  isbn          : string   PK
  slug          : string   URL용 (kebabCase(title) + '-' + isbn)
  title         : string
  author        : string
  publisher     : string
  description   : string
  coverImage    : string   URL (camelCase 통일)
  listPrice     : number   정가 (원 단위 정수)
  salePrice     : number   Math.floor(listPrice * 0.9)
  category      : string   소설/에세이/인문/경제/과학/IT
  status        : "on_sale" | "out_of_print" | "coming_soon" | "old_edition"
  isActive      : boolean
  publishDate   : Timestamp (출간일)
  rating        : number   평균 별점 (0~5, reviews 컬렉션 집계)
  reviewCount   : number   리뷰 수 (집계)
  salesCount    : number   누적 판매 수 (결제 완료 시 += quantity, 베스트셀러 정렬용)
  createdAt     : Timestamp
  updatedAt     : Timestamp

[inventory/{isbn}]
  isbn          : string
  stock         : number   실제 재고 (음수 불가)
  reserved      : number   결제 대기 예약 재고
  updatedAt     : Timestamp
  ※ available = stock - reserved

[orders/{orderId}]
  orderId         : string
  userId          : string
  status          : "pending" | "paid" | "cancelled" | "failed"
                    | "cancelled_by_customer"
                    | "return_requested" | "return_completed"
  shippingStatus  : "ready" | "shipped" | "delivered"
  items           : OrderItem[]
    └ isbn, slug, title, coverImage, quantity, unitPrice
  totalPrice      : number
  shippingFee     : number   0 또는 3000
  shippingAddress : ShippingAddress
    └ name, phone, zipCode, address, detailAddress
  paymentKey      : string | null
  createdAt       : Timestamp
  expiresAt       : Timestamp   createdAt + 30분
  paidAt          : Timestamp | null
  cancelledAt     : Timestamp | null
  deliveredAt     : Timestamp | null   (배송 완료일 — 반품 7일 기산점)
  returnStatus    : "none" | "requested" | "completed"
  returnReason    : string | null

[users/{uid}]
  uid           : string
  email         : string
  name          : string
  phone         : string
  role          : "customer" | "admin"
  addresses     : ShippingAddress[]
  createdAt     : Timestamp

[reviews/{reviewId}]
  reviewId      : string
  bookIsbn      : string   books/{isbn} 참조
  userId        : string   users/{uid} 참조
  userName      : string   스냅샷 (사용자 이름 변경 대비)
  rating        : number   1~5
  content       : string
  createdAt     : Timestamp
  ※ 작성 후 books/{isbn}.rating, reviewCount 집계 업데이트

[events/{eventId}]
  eventId       : string
  title         : string
  type          : "book_concert" | "author_talk" | "book_club"
  description   : string
  imageUrl      : string
  date          : Timestamp
  location      : string
  capacity      : number
  registeredCount: number  (집계)
  isActive      : boolean
  createdAt     : Timestamp

[eventRegistrations/{registrationId}]
  registrationId: string
  eventId       : string
  userId        : string
  userName      : string   스냅샷
  createdAt     : Timestamp

[articles/{articleId}]
  articleId     : string
  slug          : string
  type          : "author_interview" | "bookstore_story" | "publisher_story"
  title         : string
  content       : string   (마크다운)
  thumbnailUrl  : string
  isPublished   : boolean
  createdAt     : Timestamp
  updatedAt     : Timestamp

[cms/home]
  heroBanners     : Banner[]
  featuredBooks   : FeaturedBook[]
  monthlyPick     : MonthlyPick
  themeCurations  : ThemeCuration[]
  updatedAt       : Timestamp

  Banner
    id, imageUrl, linkUrl
    position: "main_hero" | "main_top" | "sidebar"
    isActive, startDate, endDate, order

  FeaturedBook
    isbn, title, coverImage, priority
    recommendationText : string   ← 독립서점 추천 이유

  MonthlyPick
    isbn          : string
    title         : string   스냅샷
    coverImage    : string   스냅샷
    description   : string   추천 글

  ThemeCuration
    id            : string
    title         : string   예: "비 오는 날 읽기 좋은 책"
    isbns         : string[] 도서 목록
    order         : number

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ZOD SCHEMAS (packages/schemas/src/)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- book.schema.ts ---

export const BookStatusEnum = z.enum([
  'on_sale', 'out_of_print', 'coming_soon', 'old_edition'
]);

export const BookSchema = z.object({
  isbn:         z.string().regex(/^978\d{10}$/),
  slug:         z.string().min(1),
  title:        z.string().min(1),
  author:       z.string().min(1),
  publisher:    z.string().min(1),
  description:  z.string(),
  coverImage:   z.string().url(),
  listPrice:    z.number().int().positive(),
  salePrice:    z.number().int().positive(),
  category:     z.string().min(1),
  status:       BookStatusEnum,
  isActive:     z.boolean().default(true),
  publishDate:  z.date(),
  rating:       z.number().min(0).max(5).default(0),
  reviewCount:  z.number().int().nonnegative().default(0),
  salesCount:   z.number().int().nonnegative().default(0),
  tableOfContents: z.string().optional(),   // 목차 (마크다운, 선택 필드)
  createdAt:    z.date(),
  updatedAt:    z.date(),
});
export type Book = z.infer<typeof BookSchema>;

export type BookFilters = {
  keyword?:  string;
  category?: string;
  page?:     number;
  pageSize?: number;
  sort?:     'latest' | 'price_asc' | 'price_desc' | 'rating';
  status?:   'on_sale' | 'coming_soon';
};

--- order.schema.ts ---

export const OrderStatusEnum = z.enum([
  'pending', 'paid', 'cancelled', 'failed',
  'cancelled_by_customer',
  'return_requested', 'return_completed'
]);

export const ShippingStatusEnum = z.enum(['ready', 'shipped', 'delivered']);

export const OrderItemSchema = z.object({
  isbn, slug, title, coverImage,
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().positive(),
});

export const ShippingAddressSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().regex(/^01[0-9]{8,9}$/),
  zipCode:       z.string().regex(/^\d{5}$/),
  address:       z.string().min(1),
  detailAddress: z.string(),
});

export const OrderSchema = z.object({
  orderId, userId, status, shippingStatus,
  items:           z.array(OrderItemSchema).min(1),
  totalPrice, shippingFee,
  shippingAddress: ShippingAddressSchema,
  paymentKey:      z.string().nullable(),
  createdAt, expiresAt,
  paidAt:          z.date().nullable(),
  cancelledAt:     z.date().nullable(),
  deliveredAt:     z.date().nullable(),   // 반품 7일 계산 기준
  returnStatus:    z.enum(['none','requested','completed']).default('none'),
  returnReason:    z.string().nullable(),
});

--- review.schema.ts ---

export const ReviewSchema = z.object({
  reviewId:  z.string(),
  bookIsbn:  z.string(),
  userId:    z.string(),
  userName:  z.string(),
  rating:    z.number().int().min(1).max(5),
  content:   z.string().min(10).max(1000),
  createdAt: z.date(),
});
export type Review = z.infer<typeof ReviewSchema>;

--- event.schema.ts ---

export const EventTypeEnum = z.enum([
  'book_concert', 'author_talk', 'book_club'
]);

export const EventSchema = z.object({
  eventId:          z.string(),
  title:            z.string().min(1),
  type:             EventTypeEnum,
  description:      z.string(),
  imageUrl:         z.string().url(),
  date:             z.date(),
  location:         z.string(),
  capacity:         z.number().int().positive(),
  registeredCount:  z.number().int().nonnegative().default(0),
  isActive:         z.boolean().default(true),
  createdAt:        z.date(),
});
export type Event = z.infer<typeof EventSchema>;

--- content.schema.ts ---

export const ArticleTypeEnum = z.enum([
  'author_interview', 'bookstore_story', 'publisher_story'
]);

export const ArticleSchema = z.object({
  articleId:     z.string(),
  slug:          z.string().min(1),
  type:          ArticleTypeEnum,
  title:         z.string().min(1),
  content:       z.string(),
  thumbnailUrl:  z.string().url(),
  isPublished:   z.boolean().default(false),
  createdAt:     z.date(),
  updatedAt:     z.date(),
});
export type Article = z.infer<typeof ArticleSchema>;

--- cms.schema.ts ---

export const FeaturedBookSchema = z.object({
  isbn:               z.string(),
  title:              z.string(),
  coverImage:         z.string().url(),
  priority:           z.number().int().nonnegative(),
  recommendationText: z.string(),   // 독립서점 추천 이유
});

export const MonthlyPickSchema = z.object({
  isbn:        z.string(),
  title:       z.string(),
  coverImage:  z.string().url(),
  description: z.string(),
});

export const ThemeCurationSchema = z.object({
  id:    z.string(),
  title: z.string(),       // "비 오는 날 읽기 좋은 책"
  isbns: z.array(z.string()),
  order: z.number().int().nonnegative(),
});

export const CmsHomeSchema = z.object({
  heroBanners:    z.array(BannerSchema),
  featuredBooks:  z.array(FeaturedBookSchema),
  monthlyPick:    MonthlyPickSchema.optional().nullable(),  // 초기 데이터 없을 때 null 허용
  themeCurations: z.array(ThemeCurationSchema),
  updatedAt:      z.date(),
});

--- index.ts ---

export * from './book.schema';
export * from './order.schema';
export * from './user.schema';
export * from './cms.schema';
export * from './event.schema';
export * from './review.schema';
export * from './content.schema';

export const ErrorCode = {
  STOCK_SHORTAGE:        'STOCK_SHORTAGE',
  ORDER_NOT_FOUND:       'ORDER_NOT_FOUND',
  ORDER_EXPIRED:         'ORDER_EXPIRED',
  PAYMENT_FAILED:        'PAYMENT_FAILED',
  PAYMENT_CANCELLED:     'PAYMENT_CANCELLED',
  EVENT_FULL:            'EVENT_FULL',          // 이벤트 정원 초과
  ALREADY_REGISTERED:    'ALREADY_REGISTERED',  // 이벤트 중복 신청
  UNAUTHORIZED:          'UNAUTHORIZED',
  FORBIDDEN:             'FORBIDDEN',
  VALIDATION_ERROR:      'VALIDATION_ERROR',
  INTERNAL_ERROR:        'INTERNAL_ERROR',
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
export type ApiResponse<T> = { data: T } | { error: ErrorCode };

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. STATE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Zustand (Client Only)
  cart.store.ts
    CartItem { isbn: string; quantity: number }
    ※ 가격은 저장 안 함 — 항상 React Query에서 가져옴
    functions: addItem, removeItem, updateQuantity, clearCart
    middleware: persist (key: 'bookstore-cart', skipHydration: true)
    수량 제한: 1개 상품 최대 주문 수량 = min(10, inventory.available)
               updateQuantity 시 초과 시도 → 재고 내 최댓값으로 자동 조정

  ui.store.ts
    isSidebarOpen, activeModal
    functions: openModal, closeModal, toggleSidebar

React Query (Server State)
  queryKeys.ts
    books.all(), books.list(filters), books.detail(slug)
    books.reviews(isbn)
    orders.list(userId), orders.detail(orderId)
    events.all(), events.detail(id)
    articles.all(), articles.detail(slug)
    cms.home()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. HOME PAGE UX SPEC (apps/web/src/app/(store)/page.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rendering: ISR revalidate: 300
데이터: Server Component → Firestore 직접 조회

페이지 구성 순서 (이 순서 변경 금지)

  1. Header
     sticky top-0, z-50, min-h-[48px]
     햄버거 메뉴 | 로고 | 검색창 | 마이페이지 | 장바구니

  2. HeroCarousel  ← cms/home.heroBanners
     Swiper Carousel
     각 슬라이드: image, headline, sub text, CTA button
     예: "오늘도 책이 당신을 기다립니다"

  3. QuickNav  ← 고정 링크
     아이콘 기반 빠른 탐색 (모바일: horizontal scroll)
     신간(/books?sort=latest) | 이달의 책(/curation/monthly)
     MD 추천(/curation/md) | 이벤트(/events) | 북콘서트(/events?type=book_concert)

  4. BestsellerSection  ← Meilisearch (sort: salesCount desc, limit: 10)
     Top 10 순위 리스트
     rank | cover | title | author

  5. FeaturedCuration (독립서점 추천)  ← cms/home.featuredBooks
     BookCarousel
     각 카드: 표지 + recommendationText

  6. MonthlyPick (이달의 책)  ← cms/home.monthlyPick
     large feature card
     cover | 추천 글 | 구매 버튼

  7. NewBooksGrid  ← books (order by createdAt desc, limit: 8)
     grid 2 column, BookCard 컴포넌트

  8. CategoryGrid  ← 고정 데이터
     icon card grid
     소설 | 에세이 | 인문 | 경제 | 과학 | IT
     링크: /books?category=...

  9. ThemeCuration (발견형 UX)  ← cms/home.themeCurations
     예: "비 오는 날 읽기 좋은 책"
     horizontal book list

  10. EventsSection  ← events (isActive=true, limit: 3)
      EventCard 컴포넌트
      이미지 | 날짜 | 제목 | 참여 버튼

  11. ContentSection  ← articles (isPublished=true, limit: 3)
      ArticleCard 컴포넌트
      작가 인터뷰 | 출판 이야기 | 서점 이야기

  12. AboutBookstore  ← 정적 콘텐츠 (CMS 관리)
      서점 사진 | 공간 소개 | 철학
      CTA: "서점 이야기 보기" → /content?type=bookstore_story

  13. Footer
      회사 정보 | 고객센터 | 이용약관 | 개인정보처리방침

홈 데이터 페치 전략
  Server Component (Firestore 직접):  cms/home, newBooks, events, articles
  Client Component (React Query):      없음 (홈은 전부 서버)
  Meilisearch:                         bestsellers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. BOOK DETAIL PAGE UX SPEC (books/[slug]/page.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rendering: SSR + generateMetadata

페이지 구성
  상단 영역
    좌: 표지 이미지 (object-fit: cover)
    우: 제목, 저자, 출판사, 가격(정가/할인가), 평점, 리뷰 수
    버튼: 장바구니 담기, 바로 구매 (min-h-[48px])
    재고 표시: available === 0 → "품절" 배지

  책 소개    : description 텍스트
  저자 소개  : author, publisher 기반 (추후 author 컬렉션 확장 가능)
  목차       : books/{isbn}.tableOfContents (선택 필드)
  리뷰 섹션  : reviews subcollection, 별점 + 내용 + 작성자
  추천 도서  : 같은 카테고리, Meilisearch 쿼리

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. TRANSACTION SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

주문 → 결제 흐름
  Step 1  POST /api/order/create → CF createOrder
          orders 생성 (status: pending, expiresAt: now+30분)
          ※ 가격은 books 컬렉션에서 서버 계산 (클라이언트 값 신뢰 금지)

  Step 2  CF reserveStock (runTransaction)
          if (stock - reserved) < quantity → throw STOCK_SHORTAGE
          reserved += quantity

  Step 3  클라이언트: 토스 결제창

  Step 4  POST /api/payment/confirm → CF confirmPayment (runTransaction)
          ① orders 상태 pending 확인 (멱등성)
          ② expiresAt > now 확인
          ③ 토스 amount == orders.totalPrice + orders.shippingFee 일치 검증
             불일치 시 → throw VALIDATION_ERROR (결제 진행 중단)
          ④ 토스 결제 승인 API
          ④ 성공: stock -= qty, reserved -= qty, status = 'paid'
             books/{isbn}.salesCount += qty (베스트셀러 집계용)
          ⑤ 실패: reserved -= qty, status = 'failed'

  Step 5  expirePendingOrders (Scheduled 매 30분)
          status=pending AND expiresAt < now → reserved -= qty, status='cancelled'

취소/반품 흐름 (PRD Section 12 참조)
  취소: shippingStatus=ready → 토스 환불 → stock 복원
  반품: deliveredAt 7일 이내 → returnStatus=requested

이벤트 신청 흐름 (추가)
  POST /api/events/register → CF registerEvent (runTransaction)
  if registeredCount >= capacity → throw EVENT_FULL
  eventRegistrations 생성, registeredCount += 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[검색 출력 원칙 — 온라인 도서몰 핵심]
  소비자가 도서를 검색했을 때 어떤 방식으로 출력할지가 가장 중요한 이슈.
  내 DB에 있으면 → Meilisearch로 즉시 검색 결과 노출 (구매 가능)
  내 DB에 없으면 → 외부 API(현재 알라딘 검색 API, 장기 BNK)로 검색 후
                   우리 레이아웃(BookCard 등)에 맞는 틀 안에서 노출
                   (예: "이런 책도 있어요" 섹션, 관심 표시/입고 요청만 가능)

[현재 — Phase 1 검색 (내 DB 우선)]

Meilisearch Index: 'books'
검색 가능:  title, author, publisher, description, category
필터 가능:  status, category, isActive
정렬 가능:  listPrice, createdAt, rating, salesCount

검색 자동완성: /api/search?autocomplete=true (제목, 저자 자동완성)
인기 검색어:   별도 analytics 집계 (추후)
최근 검색어:   localStorage (Zustand persist)

동기화: books onCreate/onUpdate → syncToMeilisearch
Rate Limit: 동일 IP 초당 10회 (upstash/ratelimit)

검색 우선순위 원칙
  1순위: 내 DB (Meilisearch) — 항상 먼저
  2순위: 외부 API 제안 — 내 DB에 없을 때만 (현재 알라딘 검색 API, 장기 BNK 전환 예정)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11-B. SEARCH PHASE 2 — BNK API 연동 (장기 플랜)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 장기: BNK API 키 발급 후 알라딘 검색 API를 BNK로 전환한다.
   현재(선택): 알라딘 검색 API로 동일한 "내 DB 없을 때 제안" UX 구현 가능.

[목적]
  사용자가 검색창에 도서명을 입력했을 때
  내 DB에 없는 도서를 외부 API(알라딘 → 장기 BNK)로 검색해
  우리 레이아웃에 맞는 틀(BookCard 등) 안에서 "이런 책도 있어요" 형태로 노출 → 관심 유도

[검색 엔진 분리 원칙]
  내 DB 검색 (Meilisearch)  ← 빠름, 항상 먼저 실행
  BNK API 검색              ← 느릴 수 있음, 내 DB 결과 없을 때만 호출
  두 엔진을 절대 합치지 않는다 (응답 속도 보장)

[작동 흐름]
  Step 1  사용자 검색어 입력
  Step 2  Meilisearch (내 DB) 우선 검색
  Step 3  내 DB 결과 즉시 화면에 표시

  Step 4  내 DB 결과 수 < 3건인 경우에만:
            /api/search/suggest 호출 (별도 엔드포인트)
            → BNK API 호출 (비동기, 내 DB 결과와 독립)
            → 응답 오면 "이런 책도 있어요" 섹션에 추가 표시
            → BNK API 응답 지연/실패 시 해당 섹션만 숨김
               (내 DB 검색 결과는 영향 없음)

[UI 분리]
  내 DB 결과    → 메인 검색 결과 영역 (항상 표시)
  BNK API 제안 → 하단 별도 섹션 "이런 책도 있어요" (조건부 표시)
  ※ 두 결과를 하나의 리스트에 섞지 않는다

[BNK API 제안 카드 표시 항목]
  표지, 제목, 저자, 출판사
  "입고 요청하기" 버튼 (관심 도서 등록 기능 — 추후 구현)
  ※ 직접 구매 불가 (내 재고 없음), 관심 표시만 가능

[추가 환경변수 — BNK API 키 발급 후 추가]
  functions/.env
    BNK_API_KEY=
  apps/web/.env.local (서버 전용)
    BNK_API_KEY=

[추가 파일 — BNK API 키 발급 후 구현]
  apps/web/src/app/api/search/suggest/route.ts
    → BNK API 호출 전용 엔드포인트 (기존 /api/search와 완전 분리)
    → Rate Limit 별도 적용 (동일 IP 초당 3회 — BNK API 부하 방지)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. SHIPPING POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기준: 교보문고 / 알라딘 / 예스24 정책 준용

  15,000원 이상 → 무료 (shippingFee: 0)
  15,000원 미만 → 3,000원 (shippingFee: 3000)

packages/utils/src/shipping.ts
  SHIPPING_FREE_THRESHOLD = 15000
  SHIPPING_FEE = 3000
  calculateShippingFee(total: number): number
  calculateDeliveryDate(orderDate: Date): Date  // date-fns addBusinessDays(3)

cart 페이지: "X원 더 담으면 무료배송!" 안내

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. RETURN POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기준: 교보문고 / 알라딘 / 예스24 + 전자상거래법

취소: shippingStatus=ready → 토스 환불 → 3~5 영업일
반품: 수령 후 7일 이내
불가: 고객 과실 훼손, 사용 흔적, 구성품 누락
배송비: 단순변심 → 고객 부담(왕복 6,000원)
        파본/오배송 → 판매자 부담
환불: 반품 수령 후 3영업일 이내

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. EVENT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이벤트 유형: book_concert, author_talk, book_club

신청 흐름
  CF registerEvent (runTransaction)
  ① eventRegistrations 중복 확인 (userId + eventId)
  ② if registeredCount >= capacity → throw EVENT_FULL
  ③ eventRegistrations 생성
  ④ events/{eventId}.registeredCount += 1

취소: eventRegistrations 삭제, registeredCount -= 1

관리자: 이벤트 등록/수정/삭제, 참가자 목록 조회

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. REVIEW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

작성 조건: 해당 도서 구매 완료 (status=paid) 한 사용자만 작성 가능
1인 1권 1리뷰 (중복 작성 불가)

작성 흐름
  CF createReview (runTransaction)
  ① orders 에서 구매 이력 확인
  ② reviews 중복 확인
  ③ reviews/{reviewId} 생성
  ④ books/{isbn}.rating 재계산, reviewCount += 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. AUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

지원: 이메일+비밀번호, Google OAuth
추후: 네이버 로그인 (커스텀 토큰 방식)

비밀번호: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
회원가입 시 users/{uid} 생성 (role: 'customer')

Admin: Firebase Custom Claims { "role": "admin" } 수동 설정
  const result = await user.getIdTokenResult();
  const isAdmin = result.claims.role === 'admin';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. CSV BULK IMPORT & 알라딘 API 연동
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[관리자 도서 등록 UX — 2단계]
  1단계  CSV/엑셀 파일 업로드 (헤더: isbn, stock 만)
  2단계  "자료 수집" 버튼 클릭
         → 엑셀에 있는 isbn을 기준으로 알라딘 API에서 표지·소개·정가 등 수집
         → 수량(stock) 입력값을 재고(inventory)에 반영
         → books + inventory DB 구축 (코드 수정 없이 관리자만으로 도서 등록)

[CSV 헤더] — 딱 2개만
  isbn, stock   (isbn = ISBN-13 기준, 수량 = stock)

[ISBN 정규화]
  CSV/Excel에서 isbn이 13자리 숫자 또는 "13자리숫자.0" 형태로 들어올 수 있음.
  → 소수점 이하 제거, 앞뒤 공백 제거 후 13자리 문자열로 정규화
  → 최종 검증: ISBN-13 형식 (978 + 10자리 숫자 = 13자리) 만 허용
  → 정규화된 isbn으로 알라딘 API 호출 (itemIdType=ISBN13, ItemId={isbn})

[도서 등록 전체 흐름]
  Step 1  관리자 영역에서 CSV 업로드 (isbn, stock 2개만)
  Step 2  papaparse 파싱 → isbn 정규화(위 규칙) 후 형식 검증
  Step 3  CF bulkCreateBooks 호출
  Step 4  CF에서 isbn별 알라딘 ItemLookUp API 호출
          GET https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx
            ?ttbkey={ALADIN_TTB_KEY}
            &itemIdType=ISBN13
            &ItemId={isbn}
            &output=js
            &Version=20131101
            &Cover=Big
  Step 5  알라딘 응답에서 도서 정보 추출 (표지·소개·정가 등):
            title, author, publisher, description (소개)
            cover URL (표지 — 임시로 수신 후 Step 6에서 Storage 저장)
            priceStandard → listPrice (정가)
            pubDate       → publishDate
            categoryName  → category
            itemStatus    → status 매핑 (절판/구판 등)
  Step 6  알라딘 cover URL → Firebase Storage에 직접 다운로드 저장
          저장 경로: books/{isbn}/cover.jpg
          내 Storage URL → coverImage 필드에 저장
          ※ 알라딘 URL 직접 저장 절대 금지 (외부 의존성 차단)
          ※ cover URL 없는 경우 (표지 미등록 도서):
            coverImage = Storage에 저장된 기본 표지 이미지 URL 사용
            경로: books/default_cover.jpg (관리자가 1회 업로드)
  Step 7  books/{isbn} 생성:
            알라딘 데이터 + salePrice 자동(listPrice*0.9) + slug 자동 생성
  Step 8  inventory/{isbn} 생성: stock 반영, reserved: 0
  Step 9  알라딘 응답 없는 isbn → 에러 목록 추가 (중단 없이 계속)
  Step 10 완료 후 성공/실패 건수 토스트

[알라딘 itemStatus → PRD status 매핑]
  "정상판매"   → 'on_sale'
  "절판"       → 'out_of_print'
  "품절일시"   → 'out_of_print'
  "예약판매중" → 'coming_soon'
  "구판"       → 'old_edition'   (구판 자동 감지 대응)
  그 외        → 'on_sale'

[구판/절판 자동 감지 — Scheduled Cloud Function]
  위치:     functions/src/cleanup/syncBookStatus.ts
  Schedule: 매일 새벽 2시 (pubsub schedule)

  흐름:
  1. books 컬렉션 isActive=true 전체 조회
  2. isbn 배열 50개씩 배치 분할 (API 속도 제한 대응)
  3. 배치별 알라딘 ItemLookUp API 호출 (ISBN-13 기준)
  4. itemStatus 확인:
     절판/품절 감지 시:
       books/{isbn}.status  = 'out_of_print'
       books/{isbn}.isActive = false
       → syncToMeilisearch trigger → Meilisearch 자동 제거
     구판 감지 시:
       books/{isbn}.status  = 'old_edition'
       books/{isbn}.isActive = false  (구판 판매 중단 정책에 따라 동일 처리)
     정상 → 변경 없음
  5. 처리 건수 Google Cloud Logging 기록

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. ERROR CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

성공: { data: T }
실패: { error: ErrorCode }

STOCK_SHORTAGE, ORDER_NOT_FOUND, ORDER_EXPIRED,
PAYMENT_FAILED, PAYMENT_CANCELLED,
EVENT_FULL, ALREADY_REGISTERED,
UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR, INTERNAL_ERROR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. FIRESTORE SECURITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /books/{isbn}     { allow read: if true; allow write: if false; }
    match /inventory/{isbn} { allow read: if true; allow write: if false; }
    match /orders/{orderId} {
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.userId;
      allow write: if false;
    }
    match /users/{uid} {
      allow read:   if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data)
                        .affectedKeys().hasAny(['role', 'createdAt']);
    }
    match /reviews/{reviewId} {
      allow read: if true;
      allow write: if false;   // CF만 쓰기 가능
    }
    match /events/{eventId}   { allow read: if true; allow write: if false; }
    match /eventRegistrations/{id} {
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.userId;
      allow write: if false;  // 생성/수정/삭제 모두 Cloud Functions만
    }
    match /articles/{articleId} {
      allow read: if resource.data.isPublished == true
                  || (request.auth != null
                      && request.auth.token.role == 'admin');  // 관리자는 미발행 글도 읽기 가능
      allow write: if false;  // 쓰기는 Cloud Functions만
    }
    match /cms/{document}   { allow read: if true; allow write: if false; }
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

apps/web/.env.local (클라이언트)
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  NEXT_PUBLIC_MEILISEARCH_HOST=
  NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=
  NEXT_PUBLIC_TOSS_CLIENT_KEY=

apps/web/.env.local (서버 전용)
  FIREBASE_ADMIN_PROJECT_ID=
  FIREBASE_ADMIN_CLIENT_EMAIL=
  FIREBASE_ADMIN_PRIVATE_KEY=
  MEILISEARCH_MASTER_KEY=
  TOSS_SECRET_KEY=
  TOSS_WEBHOOK_SECRET=         ← 토스 웹훅 위변조 검증용

functions/.env
  MEILISEARCH_HOST=
  MEILISEARCH_MASTER_KEY=
  TOSS_SECRET_KEY=
  ALADIN_TTB_KEY=

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20-B. 관리자 영역 원칙 (Admin CMS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

관리자 페이지는 DB 구축만큼 중요. 코드를 일일이 열어 수정하지 않고
이미지 업로드·도서 선정만으로 운영 가능해야 한다.

[재고 관리]
  Admin > 도서 관리(books)에서 재고 조회·인라인 수정.
  CSV 업로드 + "자료 수집" 버튼으로 알라딘 기반 일괄 등록 시 수량도 재고에 반영 (Section 17).

[랜딩 페이지 / 배너 영역]
  코드 수정 없이 관리자가 이미지를 업로드하면
  각 영역(main_hero, main_top, sidebar)에 맞는 크기로 리사이징 후 해당 영역에 자동 삽입.
  Banner.position 별 권장 크기는 Admin UI 또는 문서에 안내.
  ImagePreviewUploader → Firebase Storage 업로드 → 저장된 URL을 cms/home.heroBanners 등에 반영.

[카테고리별 큐레이션 — 선정도서·이달의책·MD의선택 등]
  관리자가 CMS에서 도서를 선정·순서 지정하면 해당 영역에 노출. 코드 수정 불필요.
  - featuredBooks (독립서점 추천 / MD의선택): DragSortableList로 순서 변경, recommendationText 입력
  - monthlyPick (이달의 책): 1권 선정, 추천 글 입력
  - themeCurations (테마 큐레이션): 테마별 도서 목록 선정
  데이터는 cms/home 에 저장되며 홈·큐레이션 페이지에서 즉시 반영.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. UI/UX 제약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

터치 타겟:     모든 button, a, input → min-h-[48px] min-w-[48px]
전화/우편번호: type="tel" inputMode="numeric" pattern="[0-9]*"
Safe Area:     fixed bottom-0 → pb-[env(safe-area-inset-bottom)]
Empty State:   빈 배열 → <EmptyState /> (하드코딩 금지)
이미지:        object-fit: cover 기본

이미지 업로드 제한 (ImagePreviewUploader)
  최대 크기: 5MB
  허용 형식: image/jpeg, image/png, image/webp
  초과 시 클라이언트에서 사전 차단 (서버 전송 전)

SmartLink
  href.startsWith('http') → <a target="_blank" rel="noopener noreferrer">
  그 외 → Next.js <Link>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. SEO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URL 구조
  /books/[slug]       예: atomic-habits-9780735211292
  /events/[id]
  /content/[slug]

generateMetadata 필수 (도서 상세, 콘텐츠 상세)
  title, description
  openGraph: { title, description, images: [{ url: coverImage/thumbnailUrl }] }
  twitter: { card: 'summary_large_image' }

sitemap.ts: books + articles 동적 생성
robots.ts: /admin disallow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. RENDERING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

홈 /                   ISR revalidate:300
도서 목록 /books        CSR (React Query, 검색 필터)
도서 상세 /books/[slug] SSR + generateMetadata
큐레이션 /curation/*    ISR revalidate:300
이벤트 /events          ISR revalidate:60
콘텐츠 /content/[slug]  SSR + generateMetadata (SEO)
관리자 /admin/*         CSR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24. CI/CD & MONITORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CI/CD: GitHub Actions → lint → typecheck → build → Vercel + Firebase
Monitoring: Sentry + GA4 + Vercel Analytics

KPI 지표 (서비스 성공 기준)
  검색 사용률
  도서 상세페이지 체류시간
  구매 전환율
  이벤트 참여율

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25. DEVELOPMENT PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1   프로젝트 기반       monorepo, Next.js, TS, Tailwind, ESLint
Phase 2   데이터 스키마       Zod schemas 전체, ErrorCode, ApiResponse
Phase 3   인증 & 상태         Firebase, Zustand, React Query, Auth Pages
Phase 4   공통 컴포넌트       SmartLink, EmptyState, BookCard, EventCard 등
Phase 5   Admin CMS           도서/이벤트/콘텐츠/큐레이션/배너 관리
Phase 6   Storefront 기본     홈, 도서목록, 도서상세, 장바구니
Phase 7   큐레이션 & 콘텐츠   큐레이션 페이지, 이벤트 페이지, 콘텐츠 페이지
Phase 8   검색                Meilisearch, sync CF, Search API, 검색 UI
Phase 9   결제/취소/반품       Toss, 트랜잭션, 취소CF, 반품CF
Phase 10  리뷰 & 이벤트 신청  Review CF, Event 신청 CF
Phase 11  SEO & 성능          generateMetadata, sitemap, robots
Phase 12  모니터링 & CI/CD    Sentry, GA4, GitHub Actions

━━ 장기 플랜 (Phase 13 이후) ━━
Phase 13  BNK API 연동      검색 제안 엔진 분리, "이런 책도 있어요" UI
                            ※ BNK API 인증키 발급 후 착수

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
26. COMPLETION REPORT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [Phase N / Task N — 작업명] 완료

생성/수정된 파일:
  - 경로/파일명.ts → 한 줄 설명

구현된 기능:
  - 기능 1
  - 기능 2

TypeScript 오류: 없음

다음 Task: [작업명]
진행하시겠습니까? (Y → 계속 / 수정사항 있으면 알려주세요)
