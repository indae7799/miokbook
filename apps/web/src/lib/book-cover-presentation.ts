const FORCE_STANDARD_COVER_ISBNS = new Set([
  '9788932923581',
  '9788932923598',
]);

export function shouldPreserveCoverQuality(isbn: string | null | undefined, url: string): boolean {
  if (!url) return true;
  if (isbn && FORCE_STANDARD_COVER_ISBNS.has(isbn)) return false;

  return (
    url.includes('aladin.co.kr') ||
    url.includes('/cover/') ||
    url.includes('/cover150/') ||
    url.includes('/cover200/') ||
    url.includes('/coversum/') ||
    url.includes('/uploads/books_covers_') ||
    url.includes('/books/covers/')
  );
}
