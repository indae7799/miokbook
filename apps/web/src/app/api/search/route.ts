import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getMeilisearchClient } from '@/lib/meilisearch';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  sort: z.enum(['latest', 'price_asc', 'price_desc', 'rating']).optional(),
  status: z.enum(['on_sale', 'coming_soon']).optional(),
  autocomplete: z.enum(['true', 'false']).optional(),
});

const MAX_FETCH = 200;

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function rateLimit(identifier: string): Promise<boolean> {
  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return true;
    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 s'),
    });
    const { success } = await ratelimit.limit(identifier);
    return success;
  } catch {
    return true;
  }
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await rateLimit(`search:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      keyword: searchParams.get('keyword') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      autocomplete: searchParams.get('autocomplete') ?? undefined,
    });
    const filters = parsed.success ? parsed.data : querySchema.parse({});

    const isAutocomplete = filters.autocomplete === 'true';

    const client = getMeilisearchClient();
    const indexName = 'books';

    if (client) {
      const index = client.index(indexName);
      const filterParts = ['isActive = true'];
      if (filters.category) filterParts.push(`category = "${filters.category.replace(/"/g, '\\"')}"`);
      if (filters.status) filterParts.push(`status = "${filters.status}"`);
      const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

      if (isAutocomplete) {
        const limit = 8;
        const res = await index.search(filters.keyword ?? '', {
          filter,
          limit,
          attributesToRetrieve: ['isbn', 'slug', 'title', 'author'],
        });
        const suggestions = (res.hits as Record<string, unknown>[]).map((h) => ({
          isbn: String(h.isbn ?? ''),
          slug: String(h.slug ?? ''),
          title: String(h.title ?? ''),
          author: String(h.author ?? ''),
        }));
        return NextResponse.json({ data: { suggestions } });
      }

      const sortMap: Record<string, string[]> = {
        latest: ['createdAt:desc'],
        price_asc: ['salePrice:asc'],
        price_desc: ['salePrice:desc'],
        rating: ['rating:desc'],
      };
      const sort = filters.sort ? sortMap[filters.sort] : ['createdAt:desc'];

      const offset = (filters.page - 1) * filters.pageSize;
      const res = await index.search(filters.keyword ?? '', {
        filter,
        sort,
        limit: filters.pageSize,
        offset,
      });

      const hits = (res.hits as Record<string, unknown>[]).map((h) => ({
        isbn: String(h.isbn ?? ''),
        slug: String(h.slug ?? ''),
        title: String(h.title ?? ''),
        author: String(h.author ?? ''),
        coverImage: String(h.coverImage ?? ''),
        listPrice: Number(h.listPrice ?? 0),
        salePrice: Number(h.salePrice ?? 0),
      }));

      return NextResponse.json({
        data: { hits, totalHits: res.estimatedTotalHits ?? hits.length },
        books: hits,
        totalCount: res.estimatedTotalHits ?? hits.length,
      });
    }

    if (!adminDb) {
      if (isAutocomplete) return NextResponse.json({ data: { suggestions: [] } });
      return NextResponse.json({
        data: { hits: [], totalHits: 0 },
        books: [],
        totalCount: 0,
      });
    }

    if (isAutocomplete) {
      const snap = await adminDb
        .collection('books')
        .where('isActive', '==', true)
        .limit(100)
        .get();
      const k = (filters.keyword ?? '').toLowerCase().trim();
      const suggestions = snap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            isbn: doc.id,
            slug: String(d.slug ?? ''),
            title: String(d.title ?? ''),
            author: String(d.author ?? ''),
          };
        })
        .filter((b) => !k || b.title.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))
        .slice(0, 8);
      return NextResponse.json({ data: { suggestions } });
    }

    const snap = await adminDb
      .collection('books')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(MAX_FETCH)
      .get();

    type Doc = { id: string; data: () => Record<string, unknown> };
    let list = snap.docs.map((doc: Doc) => {
      const d = doc.data();
      return {
        isbn: doc.id,
        slug: String(d.slug ?? ''),
        title: String(d.title ?? ''),
        author: String(d.author ?? ''),
        coverImage: String(d.coverImage ?? ''),
        listPrice: Number(d.listPrice ?? 0),
        salePrice: Number(d.salePrice ?? 0),
        category: String(d.category ?? ''),
        status: String(d.status ?? ''),
        rating: Number(d.rating ?? 0),
      };
    });

    if (filters.category) list = list.filter((b) => b.category === filters.category);
    if (filters.status) list = list.filter((b) => b.status === filters.status);
    if (filters.keyword?.trim()) {
      const k = filters.keyword.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(k) ||
          b.author.toLowerCase().includes(k) ||
          String(b.category).toLowerCase().includes(k)
      );
    }

    const sortMap: Record<string, (a: { salePrice: number; rating: number }, b: { salePrice: number; rating: number }) => number> = {
      price_asc: (a, b) => a.salePrice - b.salePrice,
      price_desc: (a, b) => b.salePrice - a.salePrice,
      rating: (a, b) => b.rating - a.rating,
    };
    if (filters.sort && sortMap[filters.sort]) list = [...list].sort(sortMap[filters.sort]);

    const totalCount = list.length;
    const start = (filters.page - 1) * filters.pageSize;
    const books = list.slice(start, start + filters.pageSize).map(({ isbn, slug, title, author, coverImage, listPrice, salePrice }) => ({
      isbn,
      slug,
      title,
      author,
      coverImage,
      listPrice,
      salePrice,
    }));

    return NextResponse.json({
      data: { hits: books, totalHits: totalCount },
      books,
      totalCount,
    });
  } catch (e) {
    console.error('[api/search]', e);
    return NextResponse.json(
      { data: { hits: [], totalHits: 0 }, books: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
