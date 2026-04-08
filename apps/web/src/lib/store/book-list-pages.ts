import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import { BOOK_LISTINGS_CACHE_TAG } from '@/lib/cache-tags';
import type { BookCardBook } from '@/components/books/BookCard';
import { prioritizeRecentlyImportedRows } from '@/lib/recent-import-priority';
import {
  getWindowSalesRecordCached,
  rankBestsellerPoolRows,
  type BookPoolRowForRank,
} from '@/lib/store/bestseller-ranking';

export interface BestsellerListingBook extends BookCardBook {
  category: string;
}

function toBook(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
  category?: string | null;
}): BookCardBook {
  return {
    isbn: row.isbn,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    coverImage: String(row.cover_image ?? ''),
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    category: row.category ?? null,
  };
}

function toListingBook(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
  category?: string | null;
}): BestsellerListingBook {
  return {
    ...toBook(row),
    category: String(row.category ?? ''),
  };
}

const BESTSELLER_LIMIT = 200;
const BESTSELLER_POOL_LIMIT = 600;
const NEW_BOOKS_LIMIT = 200;
const LIST_STALE_SECONDS = 30;

type BestsellerPoolRow = Parameters<typeof toBook>[0] & { category?: string | null };

async function fetchBestsellerPoolRowsUncached(): Promise<BestsellerPoolRow[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, sales_count, category')
      .eq('is_active', true)
      .limit(BESTSELLER_POOL_LIMIT);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

async function fetchActiveBooksFallback(limit: number): Promise<BestsellerPoolRow[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, sales_count, category, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return prioritizeRecentlyImportedRows(data);
  } catch {
    return [];
  }
}

const getBestsellerPoolRows = unstable_cache(fetchBestsellerPoolRowsUncached, ['store-bestseller-pool-v4'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});

export async function getBestsellersForHome(limit: number): Promise<BookCardBook[]> {
  const [pool, salesRecord] = await Promise.all([getBestsellerPoolRows(), getWindowSalesRecordCached()]);
  const ranked = rankBestsellerPoolRows(pool as BookPoolRowForRank[], salesRecord, Math.max(0, limit));
  if (ranked.length > 0) return ranked.map(toBook);
  const fallback = await fetchActiveBooksFallback(Math.max(0, limit));
  return fallback.map(toBook);
}

async function fetchNewBooksUncached(): Promise<BookCardBook[]> {
  if (isUiDesignMode() || !supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, category, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(NEW_BOOKS_LIMIT);

    if (error || !data) return [];
    return prioritizeRecentlyImportedRows(data).map(toBook);
  } catch {
    return [];
  }
}

export async function getBestsellersForListing(): Promise<BestsellerListingBook[]> {
  const [pool, salesRecord] = await Promise.all([getBestsellerPoolRows(), getWindowSalesRecordCached()]);
  const ranked = rankBestsellerPoolRows(pool as BookPoolRowForRank[], salesRecord, BESTSELLER_LIMIT);
  if (ranked.length > 0) return ranked.map(toListingBook);
  const fallback = await fetchActiveBooksFallback(BESTSELLER_LIMIT);
  return fallback.map(toListingBook);
}

export const getNewBooksForListing = unstable_cache(fetchNewBooksUncached, ['store-new-books-listing-v2'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: LIST_STALE_SECONDS,
});
