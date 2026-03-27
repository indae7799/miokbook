import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeExternalCoverUrl } from '@/lib/book-cover-storage';
import { isUiDesignMode } from '@/lib/design-mode';
import { getMeilisearchClient } from '@/lib/meilisearch';
import { sortByKeywordAndTitle } from '@/lib/search-ranking';
import { searchBooksData } from '@/lib/store/search';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  keyword: z.string().optional(),
  q: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(['latest', 'price_asc', 'price_desc', 'rating']).optional(),
  status: z.enum(['on_sale', 'coming_soon']).optional(),
  autocomplete: z.enum(['true', 'false']).optional(),
});

/** 목록·검색은 동적 데이터 — public CDN 캐시 시 빈 응답이 길게 남을 수 있음 */
const CACHE_HEADER = { 'Cache-Control': 'private, no-store' };
const AUTOCOMPLETE_CACHE_HEADER = { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' };
const AUTOCOMPLETE_LIMIT = 5;

const acCache = new Map<string, { data: unknown; ts: number }>();
const AC_CACHE_TTL = 60_000;

/**
 * `/books` 목록과 동일한 정책: 명시 false면 끔, true면 켬, 미설정이면 서비스 롤 키가 있으면 DB 폴백 허용.
 * (로컬에서 Meilisearch만 쓰려면 ALLOW_AUTOCOMPLETE_FIRESTORE_FALLBACK=false 유지)
 */
function isAutocompleteFirestoreFallbackAllowed(): boolean {
  const allow = process.env.ALLOW_AUTOCOMPLETE_FIRESTORE_FALLBACK;
  if (allow === 'true') return true;
  if (allow === 'false') return false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return true;
  return process.env.NODE_ENV === 'development';
}

function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function mapSuggestion(row: {
  isbn: string;
  slug?: string | null;
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  cover_image?: string | null;
  sale_price?: number | null;
  list_price?: number | null;
  category?: string | null;
}) {
  return {
    isbn: row.isbn,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    coverImage: normalizeExternalCoverUrl(String(row.cover_image ?? '')),
    salePrice: Number(row.sale_price ?? 0),
    listPrice: Number(row.list_price ?? 0),
    category: row.category ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      keyword: searchParams.get('keyword') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      autocomplete: searchParams.get('autocomplete') ?? undefined,
    });
    const parsedFilters = parsed.success ? parsed.data : querySchema.parse({});
    const filters = {
      ...parsedFilters,
      keyword: parsedFilters.keyword ?? parsedFilters.q,
    };
    const isAutocomplete = filters.autocomplete === 'true';

    if (isAutocomplete) {
      if (isUiDesignMode()) {
        return NextResponse.json({ data: { suggestions: [] } }, { headers: CACHE_HEADER });
      }

      const keyword = (filters.keyword ?? '').trim();
      if (!keyword) {
        return NextResponse.json({ data: { suggestions: [] } }, { headers: CACHE_HEADER });
      }

      const acKey = `ac:${keyword.toLowerCase()}`;
      const cached = acCache.get(acKey);
      if (cached && Date.now() - cached.ts < AC_CACHE_TTL) {
        return NextResponse.json(cached.data, { headers: AUTOCOMPLETE_CACHE_HEADER });
      }

      let suggestions: ReturnType<typeof mapSuggestion>[] = [];

      const client = getMeilisearchClient();
      if (client) {
        try {
          const mapHit = (hit: Record<string, unknown>) => ({
            isbn: String(hit.isbn ?? ''),
            slug: String(hit.slug ?? ''),
            title: String(hit.title ?? ''),
            author: String(hit.author ?? ''),
            publisher: String(hit.publisher ?? ''),
            coverImage: normalizeExternalCoverUrl(String(hit.coverImage ?? '')),
            salePrice: Number(hit.salePrice ?? 0),
            listPrice: Number(hit.listPrice ?? 0),
            category: typeof hit.category === 'string' ? hit.category : null,
          });
          const searchOpts = {
            filter: 'isActive = true',
            limit: AUTOCOMPLETE_LIMIT,
            attributesToRetrieve: [
              'isbn', 'slug', 'title', 'author', 'publisher', 'coverImage', 'salePrice', 'listPrice', 'category',
            ],
          };
          // 공백 제거 정규화로 먼저 시도 (도시의마음 → 도시의 마음 / 도시의 마음 → 도시의마음 모두 대응)
          const normalizedKw = normalizeForSearch(keyword);
          const res = await client.index('books').search(normalizedKw, searchOpts);
          suggestions = (res.hits as Record<string, unknown>[]).map(mapHit);

          // 정규화 결과 없으면 원본 키워드로 재시도
          if (suggestions.length === 0 && normalizedKw !== keyword.toLowerCase()) {
            const retryRes = await client.index('books').search(keyword, searchOpts);
            suggestions = (retryRes.hits as Record<string, unknown>[]).map(mapHit);
          }
        } catch {
          /* fall through */
        }
      }

      if (suggestions.length === 0) {
        if (!isAutocompleteFirestoreFallbackAllowed()) {
          console.warn(
            '[autocomplete] Meilisearch unavailable and DB fallback disabled. Set SUPABASE_SERVICE_ROLE_KEY on the server or ALLOW_AUTOCOMPLETE_FIRESTORE_FALLBACK=true.',
          );
        } else {
          const isIsbn = /^(978|979)\d{10}$/.test(keyword.replace(/\D/g, ''));
          if (isIsbn) {
            const isbn = keyword.replace(/\D/g, '').slice(0, 13);
            const { data, error } = await supabaseAdmin
              .from('books')
              .select('isbn, slug, title, author, publisher, cover_image, sale_price, list_price, category')
              .eq('isbn', isbn)
              .eq('is_active', true)
              .maybeSingle();
            if (!error && data) suggestions = [mapSuggestion(data)];
          } else {
            // 공백 제거 정규화 variant와 원본 양쪽으로 ilike 검색
            // ex) "도시의마음" → DB "도시의 마음" 도 잡고, "도시의 마음" → DB "도시의마음" 도 잡음
            const escape = (s: string) => s.replace(/[%_\\]/g, '\\$&');
            const kwOrig = escape(keyword.trim());
            const kwNorm = escape(normalizeForSearch(keyword));
            const variants = Array.from(new Set([kwOrig, kwNorm]));

            const orClauses = variants
              .flatMap((v) => [`title.ilike.%${v}%`, `author.ilike.%${v}%`])
              .join(',');

            const { data, error } = await supabaseAdmin
              .from('books')
              .select('isbn, slug, title, author, publisher, cover_image, sale_price, list_price, category')
              .eq('is_active', true)
              .or(orClauses)
              .order('sales_count', { ascending: false })
              .limit(AUTOCOMPLETE_LIMIT * 4);

            if (!error) {
              // 인메모리 2차 필터: 정규화(공백 제거) 비교로 양방향 매칭
              const kw = normalizeForSearch(keyword);
              suggestions = (data ?? [])
                .map(mapSuggestion)
                .filter(
                  (book) =>
                    !kw ||
                    normalizeForSearch(book.title).includes(kw) ||
                    normalizeForSearch(book.author).includes(kw) ||
                    book.isbn.includes(kw),
                )
                .slice(0, AUTOCOMPLETE_LIMIT);
            }
          }
        }
      }

      if (suggestions.length === 0) {
        try {
          const fallback = await searchBooksData({
            keyword,
            page: 1,
            pageSize: AUTOCOMPLETE_LIMIT,
          });

          suggestions = fallback.books.map((book) => ({
            isbn: String(book.isbn ?? ''),
            slug: String(book.slug ?? ''),
            title: String(book.title ?? ''),
            author: String(book.author ?? ''),
            publisher: '',
            coverImage: normalizeExternalCoverUrl(String(book.coverImage ?? '')),
            salePrice: Number(book.salePrice ?? 0),
            listPrice: Number(book.listPrice ?? 0),
            category: null,
          }));
        } catch {
          /* final fallback keeps empty list */
        }
      }

      suggestions = sortByKeywordAndTitle(suggestions, keyword).slice(0, AUTOCOMPLETE_LIMIT);

      const body = { data: { suggestions } };
      acCache.set(acKey, { data: body, ts: Date.now() });
      if (acCache.size > 200) {
        const oldest = acCache.keys().next().value;
        if (oldest) acCache.delete(oldest);
      }
      return NextResponse.json(body, { headers: AUTOCOMPLETE_CACHE_HEADER });
    }

    const result = await searchBooksData(filters);
    return NextResponse.json(
      {
        data: { hits: result.books, totalHits: result.totalCount },
        books: result.books,
        totalCount: result.totalCount,
        ...(result.fromAladin ? { fromAladin: true } : {}),
      },
      { headers: CACHE_HEADER },
    );
  } catch (e) {
    console.error('[api/search]', e);
    return NextResponse.json(
      { data: { hits: [], totalHits: 0 }, books: [], totalCount: 0 },
      { status: 500 },
    );
  }
}
