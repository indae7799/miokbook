import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import type { BookDetailBook } from '@/components/books/BookDetail';

const DESIGN_BOOK: BookDetailBook = {
  isbn: 'design-book-1',
  slug: 'design-book-1',
  title: '서점 온보딩 UI 작업 모드 샘플',
  author: '미옥 서점팀',
  publisher: '미옥서원 출판',
  description:
    'UI 작업 모드(UI_DESIGN_MODE=true)에서 DB reads를 없애기 위한 샘플 도서입니다.',
  coverImage:
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
  listPrice: 18000,
  salePrice: 16200,
  category: '소설',
  status: 'active',
  rating: 4.5,
  reviewCount: 23,
};

const MEM_TTL_MS = 5 * 60_000;
type BookDetailResult = { book: BookDetailBook; available: number; recommended: BookDetailBook[] } | null;
type BookMetaResult = { isbn: string; title: string; author: string; description: string; coverImage: string } | null;

const _bookDetailMem = new Map<string, { data: BookDetailResult; ts: number }>();
const _bookMetaMem = new Map<string, { data: BookMetaResult; ts: number }>();

const ISBN13_REGEX = /^97[89]\d{10}$/;

function isbnFromSlug(slug: string): string | null {
  const last13 = slug.slice(-13);
  return ISBN13_REGEX.test(last13) ? last13 : null;
}

function computeRating(row: { review_count: number; rating_total: number; rating: number | null }): number {
  const count = Number(row.review_count ?? 0);
  if (count > 0 && typeof row.rating_total === 'number') {
    return Math.round((row.rating_total / count) * 100) / 100;
  }
  return Number(row.rating ?? 0);
}

async function resolveBookRow(slug: string) {
  if (!supabaseAdmin) return null;

  const isbn = isbnFromSlug(slug);
  if (isbn) {
    const { data } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('isbn', isbn)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabaseAdmin
    .from('books')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return data ?? null;
}

async function getBookMetaBySlugInternal(slug: string): Promise<BookMetaResult> {
  const row = await resolveBookRow(slug);
  if (!row) return null;
  return {
    isbn: row.isbn,
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    description: String(row.description ?? ''),
    coverImage: String(row.cover_image ?? ''),
  };
}

async function getRecommendedBooks(category: string, excludeIsbn: string, limit: number): Promise<BookDetailBook[]> {
  if (!supabaseAdmin || !category) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(limit + 5);

    if (error || !data) return [];

    const list: BookDetailBook[] = [];
    for (const row of data) {
      if (row.isbn === excludeIsbn) continue;
      if (list.length >= limit) break;
      list.push({
        isbn: row.isbn,
        slug: String(row.slug ?? row.isbn),
        title: String(row.title ?? ''),
        author: String(row.author ?? ''),
        publisher: String(row.publisher ?? ''),
        description: String(row.description ?? ''),
        coverImage: String(row.cover_image ?? ''),
        listPrice: Number(row.list_price ?? 0),
        salePrice: Number(row.sale_price ?? 0),
        category: String(row.category ?? ''),
        status: String(row.status ?? ''),
        publishDate: row.publish_date ?? undefined,
        rating: computeRating(row),
        reviewCount: Number(row.review_count ?? 0),
      });
    }
    return list;
  } catch {
    return [];
  }
}

async function getBookAndAvailableBySlugInternal(slug: string): Promise<BookDetailResult> {
  if (!supabaseAdmin) return null;
  const row = await resolveBookRow(slug);
  if (!row) return null;

  const { data: inventory } = await supabaseAdmin
    .from('inventory')
    .select('stock, reserved')
    .eq('isbn', row.isbn)
    .maybeSingle();

  const stock = Number(inventory?.stock ?? 0);
  const reserved = Number(inventory?.reserved ?? 0);
  const available = Math.max(0, stock - reserved);

  const book: BookDetailBook = {
    isbn: row.isbn,
    slug: String(row.slug ?? slug),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    description: String(row.description ?? ''),
    coverImage: String(row.cover_image ?? ''),
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    category: String(row.category ?? ''),
    status: String(row.status ?? ''),
    publishDate: row.publish_date ?? undefined,
    rating: computeRating(row),
    reviewCount: Number(row.review_count ?? 0),
    tableOfContents: typeof row.table_of_contents === 'string' ? row.table_of_contents : undefined,
  };

  const recommended = await getRecommendedBooks(book.category, row.isbn, 4);
  return { book, available, recommended };
}

function makeBookMetaCached(slug: string) {
  return unstable_cache(
    () => getBookMetaBySlugInternal(slug),
    ['book-meta', slug],
    { revalidate: 3600 },
  );
}

function makeBookDetailCached(slug: string) {
  return unstable_cache(
    () => getBookAndAvailableBySlugInternal(slug),
    ['book-detail', slug],
    { revalidate: 3600 },
  );
}

export function invalidateBookDetailCaches(...keys: Array<string | null | undefined>): void {
  for (const key of keys) {
    const value = String(key ?? '').trim();
    if (!value) continue;
    _bookMetaMem.delete(value);
    _bookDetailMem.delete(value);
  }
}

export async function getBookMetaBySlug(slug: string): Promise<BookMetaResult> {
  if (isUiDesignMode()) {
    return { isbn: DESIGN_BOOK.isbn, title: DESIGN_BOOK.title, author: DESIGN_BOOK.author, description: DESIGN_BOOK.description ?? '', coverImage: DESIGN_BOOK.coverImage };
  }
  if (process.env.NODE_ENV === 'development') {
    const hit = _bookMetaMem.get(slug);
    if (hit && Date.now() - hit.ts < MEM_TTL_MS) return hit.data;
    const data = await getBookMetaBySlugInternal(slug);
    if (data !== null) {
      _bookMetaMem.set(slug, { data, ts: Date.now() });
    }
    return data;
  }
  return makeBookMetaCached(slug)();
}

export async function getBookAndAvailableBySlug(slug: string): Promise<BookDetailResult> {
  if (isUiDesignMode()) {
    return { book: DESIGN_BOOK, available: 5, recommended: [] };
  }
  if (process.env.NODE_ENV === 'development') {
    const hit = _bookDetailMem.get(slug);
    if (hit && Date.now() - hit.ts < MEM_TTL_MS) return hit.data;
    const data = await getBookAndAvailableBySlugInternal(slug);
    if (data !== null) {
      _bookDetailMem.set(slug, { data, ts: Date.now() });
    }
    return data;
  }
  return makeBookDetailCached(slug)();
}
