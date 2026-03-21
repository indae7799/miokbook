import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import { BOOK_LISTINGS_CACHE_TAG } from '@/lib/cache-tags';
import type { BookCardBook } from '@/components/books/BookCard';

function toBook(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
}): BookCardBook {
  return {
    isbn: row.isbn,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    coverImage: String(row.cover_image ?? ''),
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
  };
}

const BESTSELLER_LIMIT = 200;
const NEW_BOOKS_LIMIT = 200;
const LIST_STALE_SECONDS = 120;

async function fetchBestsellersUncached(): Promise<BookCardBook[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price')
      .eq('is_active', true)
      .order('sales_count', { ascending: false })
      .limit(BESTSELLER_LIMIT);

    if (error || !data) return [];
    return data.map(toBook);
  } catch {
    return [];
  }
}

async function fetchNewBooksUncached(): Promise<BookCardBook[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(NEW_BOOKS_LIMIT);

    if (error || !data) return [];
    return data.map(toBook);
  } catch {
    return [];
  }
}

export const getBestsellersForListing = unstable_cache(fetchBestsellersUncached, ['store-bestsellers-listing-v1'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});

export const getNewBooksForListing = unstable_cache(fetchNewBooksUncached, ['store-new-books-listing-v1'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});
