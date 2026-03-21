import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import type { BookCardBook } from '@/components/books/BookCard';

export interface CmsFeaturedBook {
  isbn: string;
  title: string;
  coverImage: string;
  priority: number;
  recommendationText?: string;
}

export interface CmsThemeCuration {
  id: string;
  title: string;
  description?: string;
  isbns?: string[];
  books?: { isbn: string; title?: string; coverImage?: string }[];
  order?: number;
}

export interface CmsHomeData {
  featuredBooks: CmsFeaturedBook[];
  themeCurations: CmsThemeCuration[];
}

export async function getCmsHome(): Promise<CmsHomeData> {
  if (isUiDesignMode() || !supabaseAdmin) {
    return { featuredBooks: [], themeCurations: [] };
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('cms')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();

    if (error || !data || !data.value || typeof data.value !== 'object' || Array.isArray(data.value)) {
      return { featuredBooks: [], themeCurations: [] };
    }

    const value = data.value as Record<string, unknown>;
    const featuredBooks = ((value.featuredBooks ?? []) as CmsFeaturedBook[])
      .slice()
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const themeCurations = ((value.themeCurations ?? []) as CmsThemeCuration[])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return { featuredBooks, themeCurations };
  } catch {
    return { featuredBooks: [], themeCurations: [] };
  }
}

export async function getFeaturedBooksAsCardBooks(): Promise<BookCardBook[]> {
  try {
    const { featuredBooks } = await getCmsHome();
    if (!supabaseAdmin || featuredBooks.length === 0) return [];

    const isbns = featuredBooks.map((book) => book.isbn);
    const { data: books } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price')
      .in('isbn', isbns);

    const bookMap = new Map((books ?? []).map((book) => [book.isbn, book]));
    return featuredBooks
      .map((featured) => {
        const book = bookMap.get(featured.isbn);
        if (!book) return null;
        return {
          isbn: featured.isbn,
          slug: book.slug ?? '',
          title: book.title ?? featured.title,
          author: book.author ?? '',
          coverImage: book.cover_image ?? featured.coverImage,
          listPrice: Number(book.list_price ?? 0),
          salePrice: Number(book.sale_price ?? 0),
        } as BookCardBook;
      })
      .filter((book): book is BookCardBook => book !== null);
  } catch {
    return [];
  }
}

export async function getThemeCurationById(id: string): Promise<{ id: string; title: string; description?: string; books: BookCardBook[] } | null> {
  try {
    const { themeCurations } = await getCmsHome();
    const theme = themeCurations.find((item) => item.id === id);
    if (!supabaseAdmin || !theme) return null;

    const isbns = theme.isbns?.length ? theme.isbns : (theme.books?.map((book) => book.isbn) ?? []);
    if (isbns.length === 0) return { id: theme.id, title: theme.title, description: theme.description, books: [] };

    const { data: books } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, is_active')
      .in('isbn', isbns);

    const bookMap = new Map((books ?? []).map((book) => [book.isbn, book]));
    const mapped = isbns
      .map((isbn) => {
        const book = bookMap.get(isbn);
        if (!book || !book.is_active) return null;
        return {
          isbn,
          slug: book.slug ?? '',
          title: book.title ?? '',
          author: book.author ?? '',
          coverImage: book.cover_image ?? '',
          listPrice: Number(book.list_price ?? 0),
          salePrice: Number(book.sale_price ?? 0),
        } as BookCardBook;
      })
      .filter((book): book is BookCardBook => book !== null);

    return { id: theme.id, title: theme.title, description: theme.description, books: mapped };
  } catch {
    return null;
  }
}
