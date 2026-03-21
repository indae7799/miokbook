import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isUiDesignMode } from '@/lib/design-mode';
import { getMeilisearchClient } from '@/lib/meilisearch';
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

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=120' };
const AUTOCOMPLETE_LIMIT = 5;

const acCache = new Map<string, { data: unknown; ts: number }>();
const AC_CACHE_TTL = 60_000;

function isAutocompleteFirestoreFallbackAllowed(): boolean {
  return process.env.ALLOW_AUTOCOMPLETE_FIRESTORE_FALLBACK === 'true';
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
            '[autocomplete] Meilisearch unavailable and DB fallback disabled. Set ALLOW_AUTOCOMPLETE_FIRESTORE_FALLBACK=true to allow fallback.',
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
            const { data, error } = await supabaseAdmin
              .from('books')
              .select('isbn, slug, title, author, publisher, cover_image, sale_price, list_price')
              .eq('is_active', true)
              .order('sales_count', { ascending: false })
              .limit(80);

            if (!error) {
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
