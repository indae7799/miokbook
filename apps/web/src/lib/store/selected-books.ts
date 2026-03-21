import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BookCardBook } from '@/components/books/BookCard';
import { GRADE_KEYS, type GradeKey } from '@/lib/constants/grades';

export interface SelectedBooksData {
  banner: { imageUrl: string; linkUrl: string } | null;
  grades: Partial<Record<GradeKey, BookCardBook[]>>;
}

export async function getSelectedBooksData(): Promise<SelectedBooksData> {
  if (!supabaseAdmin) return { banner: null, grades: {} };

  try {
    const { data, error } = await supabaseAdmin
      .from('cms')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();

    if (error || !data || !data.value || typeof data.value !== 'object' || Array.isArray(data.value)) {
      return { banner: null, grades: {} };
    }

    const value = data.value as Record<string, unknown>;
    const selectedBooks = (value.selectedBooks ?? {}) as Partial<Record<GradeKey, { isbn: string }[]>>;
    const bannerRaw = value.selectedBooksBanner as { imageUrl?: string; linkUrl?: string } | null | undefined;
    const banner =
      bannerRaw?.imageUrl?.trim()
        ? { imageUrl: bannerRaw.imageUrl, linkUrl: bannerRaw.linkUrl?.trim() || '/' }
        : null;

    const allIsbns = GRADE_KEYS.flatMap(({ key }) => (selectedBooks[key] ?? []).map((book) => book.isbn));
    const uniqueIsbns = Array.from(new Set(allIsbns));
    if (uniqueIsbns.length === 0) return { banner, grades: {} };

    const { data: books } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, is_active')
      .in('isbn', uniqueIsbns);

    const booksMap = new Map((books ?? []).map((book) => [book.isbn, book]));
    const grades: Partial<Record<GradeKey, BookCardBook[]>> = {};

    for (const { key } of GRADE_KEYS) {
      const gradeIsbns = (selectedBooks[key] ?? []).map((book) => book.isbn);
      const mapped = gradeIsbns
        .map((isbn) => {
          const book = booksMap.get(isbn);
          if (!book || book.is_active === false) return null;
          return {
            isbn,
            slug: String(book.slug ?? isbn),
            title: String(book.title ?? ''),
            author: String(book.author ?? ''),
            coverImage: String(book.cover_image ?? ''),
            listPrice: Number(book.list_price ?? 0),
            salePrice: Number(book.sale_price ?? 0),
          } as BookCardBook;
        })
        .filter((book): book is BookCardBook => book !== null);

      if (mapped.length > 0) grades[key] = mapped;
    }

    return { banner, grades };
  } catch (e) {
    console.error('[getSelectedBooksData]', e);
    return { banner: null, grades: {} };
  }
}
