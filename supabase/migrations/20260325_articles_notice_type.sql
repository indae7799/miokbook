ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_type_check;

ALTER TABLE articles
  ADD CONSTRAINT articles_type_check
  CHECK (type IN ('author_interview', 'bookstore_story', 'publisher_story', 'notice'));
