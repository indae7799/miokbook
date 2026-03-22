import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import { BOOK_LISTINGS_CACHE_TAG } from '@/lib/cache-tags';
import type { BookCardBook } from '@/components/books/BookCard';
import {
  getWindowSalesRecordCached,
  rankBestsellerPoolRows,
  type BookPoolRowForRank,
} from '@/lib/store/bestseller-ranking';

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
/** 노출 후보 풀 (전체 활성 도서가 많으면 이 상한 내에서만) */
const BESTSELLER_POOL_LIMIT = 600;
const NEW_BOOKS_LIMIT = 200;
const LIST_STALE_SECONDS = 120;

type BestsellerPoolRow = Parameters<typeof toBook>[0];

async function fetchBestsellerPoolRowsUncached(): Promise<BestsellerPoolRow[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, sales_count')
      .eq('is_active', true)
      .limit(BESTSELLER_POOL_LIMIT);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

const getBestsellerPoolRows = unstable_cache(fetchBestsellerPoolRowsUncached, ['store-bestseller-pool-v3'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});

export async function getBestsellersForHome(limit: number): Promise<BookCardBook[]> {
  const [pool, salesRecord] = await Promise.all([getBestsellerPoolRows(), getWindowSalesRecordCached()]);
  const ranked = rankBestsellerPoolRows(pool as BookPoolRowForRank[], salesRecord, Math.max(0, limit));
  return ranked.map(toBook);
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

export async function getBestsellersForListing(): Promise<BookCardBook[]> {
  const [pool, salesRecord] = await Promise.all([getBestsellerPoolRows(), getWindowSalesRecordCached()]);
  const ranked = rankBestsellerPoolRows(pool as BookPoolRowForRank[], salesRecord, BESTSELLER_LIMIT);
  return ranked.map(toBook);
}

export const getNewBooksForListing = unstable_cache(fetchNewBooksUncached, ['store-new-books-listing-v1'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});
