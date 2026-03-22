-- youtube_contents: 컬럼명 order 는 PostgREST/예약어와 충돌하여
-- GET /rest/v1/youtube_contents?select=...,order&order=order.asc 형태가 깨질 수 있음.
-- Supabase SQL Editor에서 한 번 실행하세요.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'youtube_contents'
      AND column_name = 'order'
  ) THEN
    ALTER TABLE public.youtube_contents RENAME COLUMN "order" TO sort_order;
  END IF;
END $$;
