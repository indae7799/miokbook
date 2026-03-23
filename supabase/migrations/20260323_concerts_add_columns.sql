-- concerts 테이블에 누락된 컬럼 추가 (안전하게 IF NOT EXISTS 체크)
-- Supabase SQL Editor 에서 한 번 실행하세요.

DO $$
BEGIN
  -- fee_label
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'fee_label'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN fee_label text NOT NULL DEFAULT '';
  END IF;

  -- fee_note
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'fee_note'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN fee_note text NOT NULL DEFAULT '';
  END IF;

  -- host_note
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'host_note'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN host_note text NOT NULL DEFAULT '';
  END IF;

  -- status_badge
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'status_badge'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN status_badge text NOT NULL DEFAULT '';
  END IF;

  -- ticket_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'ticket_price'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN ticket_price integer NOT NULL DEFAULT 0;
  END IF;

  -- ticket_open
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'ticket_open'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN ticket_open boolean NOT NULL DEFAULT false;
  END IF;

  -- ticket_sold_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'ticket_sold_count'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN ticket_sold_count integer NOT NULL DEFAULT 0;
  END IF;

  -- review_youtube_ids
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'review_youtube_ids'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN review_youtube_ids text[] NOT NULL DEFAULT '{}';
  END IF;

  -- booking_label (초기 테이블에 없었을 수 있음)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'booking_label'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN booking_label text NOT NULL DEFAULT '신청하기';
  END IF;

  -- booking_notice_title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'booking_notice_title'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN booking_notice_title text NOT NULL DEFAULT '예약 안내';
  END IF;

  -- booking_notice_body
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concerts' AND column_name = 'booking_notice_body'
  ) THEN
    ALTER TABLE public.concerts ADD COLUMN booking_notice_body text NOT NULL DEFAULT '';
  END IF;

END $$;
