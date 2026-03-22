-- ════════════════════════════════════════════════════════════════
-- 미옥서원 Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 실행
-- ════════════════════════════════════════════════════════════════

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── books ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  isbn              TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL DEFAULT '',
  author            TEXT NOT NULL DEFAULT '',
  publisher         TEXT NOT NULL DEFAULT '',
  description       TEXT DEFAULT '',
  cover_image       TEXT DEFAULT '',
  list_price        INTEGER NOT NULL DEFAULT 0,
  sale_price        INTEGER NOT NULL DEFAULT 0,
  category          TEXT DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'on_sale'
                      CHECK (status IN ('on_sale','out_of_print','coming_soon','old_edition')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  publish_date      TIMESTAMPTZ,
  rating            NUMERIC(4,2) DEFAULT 0,
  rating_total      INTEGER DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  sales_count       INTEGER DEFAULT 0,
  table_of_contents TEXT DEFAULT '',
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS books_category_idx ON books(category);
CREATE INDEX IF NOT EXISTS books_is_active_idx ON books(is_active);
CREATE INDEX IF NOT EXISTS books_sales_count_idx ON books(sales_count DESC);
CREATE INDEX IF NOT EXISTS books_created_at_idx ON books(created_at DESC);

-- ─── inventory ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  isbn        TEXT PRIMARY KEY REFERENCES books(isbn) ON DELETE CASCADE,
  stock       INTEGER NOT NULL DEFAULT 0,
  reserved    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── orders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  order_id         TEXT PRIMARY KEY,
  user_id          TEXT,                          -- Firebase Auth UID (NULL = 비회원)
  guest_phone      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','cancelled','failed',
                       'cancelled_by_customer','return_requested','return_completed',
                       'exchange_requested','exchange_completed')),
  shipping_status  TEXT NOT NULL DEFAULT 'ready'
                     CHECK (shipping_status IN ('ready','shipped','delivered')),
  items            JSONB NOT NULL DEFAULT '[]',   -- [{isbn, title, quantity, unitPrice, ...}]
  total_price      INTEGER NOT NULL DEFAULT 0,
  shipping_fee     INTEGER NOT NULL DEFAULT 0,
  shipping_address JSONB,                         -- {name, phone, zipCode, address, detailAddress}
  tracking_number  TEXT,
  carrier          TEXT,
  payment_key      TEXT,
  return_status    TEXT,
  return_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  return_completed_at TIMESTAMPTZ,
  exchange_completed_at TIMESTAMPTZ
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS exchange_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_paid_at_idx ON orders(paid_at DESC);

-- ─── reviews ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  review_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  book_isbn   TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_book_isbn_idx ON reviews(book_isbn);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_book_idx ON reviews(user_id, book_isbn);

-- ─── events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  event_id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT DEFAULT '',
  image_url        TEXT DEFAULT '',
  type             TEXT NOT NULL CHECK (type IN ('book_concert','author_talk','book_club')),
  date             TIMESTAMPTZ,
  location         TEXT DEFAULT '',
  capacity         INTEGER DEFAULT 0,
  registered_count INTEGER DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── event_registrations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_registrations (
  registration_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id        TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  event_title     TEXT DEFAULT '',
  user_id         TEXT NOT NULL,
  user_name       TEXT DEFAULT '',
  user_email      TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  retention_quarter TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'registered',
  cancel_reason   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ
);
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS event_title TEXT DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS retention_quarter TEXT DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS event_reg_event_idx ON event_registrations(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_reg_user_event_idx ON event_registrations(user_id, event_id);

-- ─── articles (서점 콘텐츠) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  article_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug          TEXT UNIQUE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('author_interview','bookstore_story','publisher_story')),
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── concerts (북콘서트) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concerts (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title                 TEXT NOT NULL DEFAULT '',
  slug                  TEXT UNIQUE NOT NULL DEFAULT '',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  image_url             TEXT DEFAULT '',
  table_rows            JSONB NOT NULL DEFAULT '[]',  -- [{label, value}]
  book_isbns            TEXT[] DEFAULT '{}',
  description           TEXT DEFAULT '',
  google_maps_embed_url TEXT DEFAULT '',
  booking_url           TEXT DEFAULT '',
  booking_label         TEXT DEFAULT '신청하기',
  booking_notice_title  TEXT DEFAULT '예약 안내',
  booking_notice_body   TEXT DEFAULT '북콘서트 신청은 외부 예약 페이지에서 진행됩니다.',
  fee_label             TEXT DEFAULT '',
  fee_note              TEXT DEFAULT '',
  host_note             TEXT DEFAULT '',
  status_badge          TEXT DEFAULT '',
  ticket_price          INTEGER NOT NULL DEFAULT 0,
  ticket_open           BOOLEAN NOT NULL DEFAULT false,
  ticket_sold_count     INTEGER NOT NULL DEFAULT 0,
  date                  TIMESTAMPTZ,
  "order"               INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_url TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_label TEXT DEFAULT '신청하기';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_notice_title TEXT DEFAULT '예약 안내';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_notice_body TEXT DEFAULT '북콘서트 신청은 외부 예약 페이지에서 진행됩니다.';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS fee_label TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS fee_note TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS host_note TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS status_badge TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS ticket_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS ticket_open BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE concerts ADD COLUMN IF NOT EXISTS ticket_sold_count INTEGER NOT NULL DEFAULT 0;

-- ─── cms (홈페이지 CMS — key/value 싱글톤) ──────────────────────
CREATE TABLE IF NOT EXISTS cms (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 초기 데이터
INSERT INTO cms (key, value) VALUES ('home', '{}') ON CONFLICT (key) DO NOTHING;

-- ─── settings (상점 설정) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO settings (key, value) VALUES ('store', '{}') ON CONFLICT (key) DO NOTHING;

-- ─── youtube_contents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS youtube_contents (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug                 TEXT UNIQUE NOT NULL,
  title                TEXT NOT NULL DEFAULT '',
  description          TEXT DEFAULT '',
  youtube_id           TEXT NOT NULL DEFAULT '',
  thumbnail_url        TEXT DEFAULT '',
  is_published         BOOLEAN NOT NULL DEFAULT false,
  "order"              INTEGER DEFAULT 0,
  related_youtube_ids  TEXT[] DEFAULT '{}',
  related_isbns        TEXT[] DEFAULT '{}',
  published_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── bulk_orders (대량/단체 주문) ────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_orders (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization  TEXT DEFAULT '',
  contact_name  TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  delivery_date TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  books         JSONB NOT NULL DEFAULT '[]',
  notes         TEXT DEFAULT '',
  quote         JSONB,
  contract      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── user_profiles (Firebase Auth UID 연동) ──────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  uid          TEXT PRIMARY KEY,   -- Firebase Auth UID
  display_name TEXT,
  email        TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'user',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) 정책
-- service_role 키는 RLS 우회 → 서버(admin.ts)에서만 사용
-- ════════════════════════════════════════════════════════════════

-- 공개 읽기 허용 테이블
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_public_read" ON books FOR SELECT USING (is_active = true);

ALTER TABLE concerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concerts_public_read" ON concerts FOR SELECT USING (is_active = true);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON articles FOR SELECT USING (is_published = true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_read" ON events FOR SELECT USING (is_active = true);

ALTER TABLE cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_public_read" ON cms FOR SELECT USING (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);

-- 나머지 테이블은 service_role만 (서버에서만 접근)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "youtube_public_read" ON youtube_contents FOR SELECT USING (is_published = true);
