import { NextResponse } from 'next/server';
import { z } from 'zod';
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
}) {
  return {
    isbn: row.isbn,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    coverImage: String(row.cover_image ?? ''),
    salePrice: Number(row.sale_price ?? 0),
    listPrice: Number(row.list_price ?? 0),
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
        return NextResponse.json(cached.data, { headers: CACHE_HEADER });
      }

      let suggestions: ReturnType<typeof mapSuggestion>[] = [];

      const client = getMeilisearchClient();
      if (client) {
        try {
          const normalizedKw = normalizeForSearch(keyword);
          const res = await client.index('books').search(normalizedKw, {
            filter: 'isActive = true',
            limit: AUTOCOMPLETE_LIMIT,
            attributesToRetrieve: [
              'isbn', 'slug', 'title', 'author', 'publisher', 'coverImage', 'salePrice', 'listPrice',
            ],
          });
          suggestions = (res.hits as Record<string, unknown>[]).map((hit) => ({
            isbn: String(hit.isbn ?? ''),
            slug: String(hit.slug ?? ''),
            title: String(hit.title ?? ''),
            author: String(hit.author ?? ''),
            publisher: String(hit.publisher ?? ''),
            coverImage: String(hit.coverImage ?? ''),
            salePrice: Number(hit.salePrice ?? 0),
            listPrice: Number(hit.listPrice ?? 0),
          }));

          if (suggestions.length === 0 && normalizedKw !== keyword.toLowerCase()) {
            const retryRes = await client.index('books').search(keyword, {
              filter: 'isActive = true',
              limit: AUTOCOMPLETE_LIMIT,
              attributesToRetrieve: [
                'isbn', 'slug', 'title', 'author', 'publisher', 'coverImage', 'salePrice', 'listPrice',
              ],
            });
            suggestions = (retryRes.hits as Record<string, unknown>[]).map((hit) => ({
              isbn: String(hit.isbn ?? ''),
              slug: String(hit.slug ?? ''),
              title: String(hit.title ?? ''),
              author: String(hit.author ?? ''),
              publisher: String(hit.publisher ?? ''),
              coverImage: String(hit.coverImage ?? ''),
              salePrice: Number(hit.salePrice ?? 0),
              listPrice: Number(hit.listPrice ?? 0),
            }));
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
              .select('isbn, slug, title, author, publisher, cover_image, sale_price, list_price')
              .eq('isbn', isbn)
              .eq('is_active', true)
              .maybeSingle();
            if (!error && data) suggestions = [mapSuggestion(data)];
          } else {
            // ilike 로 DB 전체에서 직접 검색 — 판매량 상위 N개 제한 없이 정확히 매칭
            const kwSafe = keyword.trim().replace(/[%_\\]/g, '\\$&');
            const { data, error } = await supabaseAdmin
              .from('books')
              .select('isbn, slug, title, author, publisher, cover_image, sale_price, list_price')
              .eq('is_active', true)
              .or(`title.ilike.%${kwSafe}%,author.ilike.%${kwSafe}%`)
              .order('sales_count', { ascending: false })
              .limit(AUTOCOMPLETE_LIMIT * 4);

            if (!error) {
              // 공백 제거 정규화로 2차 필터 (ex. 사용자가 공백 생략해 입력한 경우 대응)
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

      suggestions = sortByKeywordAndTitle(suggestions, keyword).slice(0, AUTOCOMPLETE_LIMIT);

      const body = { data: { suggestions } };
      acCache.set(acKey, { data: body, ts: Date.now() });
      if (acCache.size > 200) {
        const oldest = acCache.keys().next().value;
        if (oldest) acCache.delete(oldest);
      }
      return NextResponse.json(body, { headers: CACHE_HEADER });
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
