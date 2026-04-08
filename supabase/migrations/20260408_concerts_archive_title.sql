ALTER TABLE public.concerts
ADD COLUMN IF NOT EXISTS archive_title TEXT;
