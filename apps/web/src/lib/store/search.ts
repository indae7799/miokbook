import type { BookFilters } from '@online-miok/schemas';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { isUiDesignMode } from '@/lib/design-mode';
import { getMeilisearchClient, getMeilisearchServer } from '@/lib/meilisearch';
import {
  getFallbackBooksFromRedis,
  setFallbackBooksToRedis,
  type FallbackBookRow,
} from '@/lib/search-fallback-redis';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface BookSearchItem {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
}

export interface SearchResponse {
  books: BookSearchItem[];
  totalCount: number;
  fromAladin?: boolean;
}

const MAX_FETCH = 500;
const ALADIN_SUPPLEMENT_THRESHOLD = 3;
const SERVER_CACHE_TTL = 2 * 60 * 1000;
const ALADIN_SEARCH = 'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';
const ALADIN_TIMEOUT_MS = 4000;
const ALADIN_BREAKER_THRESHOLD = 3;
const ALADIN_BREAKER_COOLDOWN_MS = 60 * 1000;

const serverCache = new Map<string, { data: SearchResponse; ts: number }>();

const DESIGN_MODE_BOOKS: BookSearchItem[] = [
  {
    isbn: 'design-1',
    slug: 'design-book-1',
    title: '프로젝트 디자이너의 책상',
    author: '미옥 에디터',
    coverImage: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400',
    listPrice: 18000,
    salePrice: 16200,
  },
  {
    isbn: 'design-2',
    slug: 'design-book-2',
    title: '인터랙션 설계 라이브러리',
    author: 'UX 팀',
    coverImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=400',
    listPrice: 22000,
    salePrice: 19800,
  },
  {
    isbn: 'design-3',
    slug: 'design-book-3',
    title: '타이포그래피 실전 가이드',
    author: '브랜드 스튜디오',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=400',
    listPrice: 19500,
    salePrice: 17600,
  },
];

interface AladinSearchItem {
  title?: string;
  author?: string;
  isbn13?: string;
  cover?: string;
  priceStandard?: number;
  categoryName?: string;
  stockStatus?: string;
}

const aladinCircuitState = {
  failureCount: 0,
  openedUntil: 0,
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  소설: ['소설', '소설/시/희곡'],
  에세이: ['에세이'],
  인문: ['인문', '인문학', '사회과학', '역사'],
  경제: ['경제', '경제경영'],
  과학: ['과학'],
  IT: ['IT', '컴퓨터/모바일'],
  기타: ['기타'],
};

function noPublicMeilisearchHost(): boolean {
  const h = (process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? '').trim().toLowerCase();
  if (!h) return true;
  return h.includes('localhost') || h.includes('127.0.0.1') || h.includes('0.0.0.0') || h.endsWith('.local');
}

function isSearchFirestoreFallbackAllowed(): boolean {
  const allow = process.env.ALLOW_SEARCH_FIRESTORE_FALLBACK;
  if (allow === 'true') return true;
  if (allow === 'false') return false;
  return process.env.NODE_ENV === 'development';
}

function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function titleMatchesKeyword(title: string, keyword: string): boolean {
  return keyword ? normalizeForSearch(title).includes(keyword) : false;
}

function searchDesignModeBooks(filters: BookFilters): SearchResponse {
  const keyword = normalizeForSearch(filters.keyword?.trim() ?? '');
  let list = DESIGN_MODE_BOOKS;

  if (keyword) {
    list = list.filter(
      (b) =>
        normalizeForSearch(b.title).includes(keyword) ||
        normalizeForSearch(b.author).includes(keyword) ||
        b.isbn.includes(keyword),
    );
  }

  const totalCount = list.length;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const start = (page - 1) * pageSize;
  return { books: list.slice(start, start + pageSize), totalCount };
}

function shouldSkipSnapshot(): boolean {
  if (process.env.DISABLE_SEARCH_FIRESTORE_FALLBACK === 'true') return true;
  const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (hasRedis) return false;
  const protect = process.env.VERCEL === '1' || process.env.PROTECT_SEARCH_FIRESTORE_FALLBACK === 'true';
  if (!protect) return false;
  return noPublicMeilisearchHost();
}

function bookMatchesCategoryTab(bookCategory: string, tab: string): boolean {
  const slug = mapAladinCategoryToSlug(bookCategory);
  if (tab === '기타') return slug === '기타';
  return slug === tab;
}

function deduplicateByIsbn(books: BookSearchItem[]): BookSearchItem[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    if (seen.has(book.isbn)) return false;
    seen.add(book.isbn);
    return true;
  });
}

async function fetchExistingBookIsbns(isbns: string[]): Promise<Set<string>> {
  if (isbns.length === 0) return new Set();
  const { data, error } = await supabaseAdmin.from('books').select('isbn').in('isbn', isbns);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.isbn));
}

async function fetchAladinItems(query: string, controller: AbortController, ttbKey: string): Promise<AladinSearchItem[]> {
  const url =
    `${ALADIN_SEARCH}?ttbkey=${encodeURIComponent(ttbKey)}&Query=${encodeURIComponent(query)}` +
    '&QueryType=Keyword&MaxResults=30&Start=1&SearchTarget=Book&output=js&Version=20131101';

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ALADIN_HTTP_${res.status}`);
    const text = await res.text();
    const data = JSON.parse(text.replace(/;\s*$/, '')) as { item?: AladinSearchItem[] };
    return data.item ?? [];
  } catch {
    return [];
  }
}

async function aladinFallback(keyword: string, requestedCategory?: string): Promise<BookSearchItem[]> {
  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) return [];
  if (Date.now() < aladinCircuitState.openedUntil) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALADIN_TIMEOUT_MS);

  try {
    let items = await fetchAladinItems(keyword, controller, ttbKey);

    if (items.length === 0) {
      const normalized = keyword.replace(/\s+/g, '');
      if (normalized !== keyword) items = await fetchAladinItems(normalized, controller, ttbKey);
    }

    if (items.length === 0 && keyword.includes(' ')) {
      const firstWord = keyword.split(/\s+/)[0];
      if (firstWord && firstWord.length >= 2) items = await fetchAladinItems(firstWord, controller, ttbKey);
    }

    const validItems = items.filter((item) => String(item.isbn13 ?? '').trim());
    const onSaleItems = validItems.filter((item) => {
      const status = item.stockStatus ?? '';
      return !status.includes('절판') && !status.includes('품절') && !status.includes('중고');
    });

    let filteredByCategory = onSaleItems;
    if (requestedCategory) {
      const strict = onSaleItems.filter((item) => mapAladinCategoryToSlug(item.categoryName) === requestedCategory);
      filteredByCategory = strict.length > 0 ? strict : onSaleItems;
    }

    const isbnList = filteredByCategory.map((item) => String(item.isbn13!).trim());
    const existsSet = await fetchExistingBookIsbns(isbnList);

    const out: BookSearchItem[] = [];
    for (const item of filteredByCategory) {
      const isbn = String(item.isbn13!).trim();
      if (existsSet.has(isbn)) continue;
      const listPrice = Math.max(0, Number(item.priceStandard ?? 0));
      out.push({
        isbn,
        slug: isbn,
        title: String(item.title ?? ''),
        author: String(item.author ?? ''),
        coverImage: String(item.cover ?? ''),
        listPrice,
        salePrice: listPrice,
      });
    }

    aladinCircuitState.failureCount = 0;
    aladinCircuitState.openedUntil = 0;
    return out;
  } catch (err) {
    aladinCircuitState.failureCount += 1;
    if (aladinCircuitState.failureCount >= ALADIN_BREAKER_THRESHOLD) {
      aladinCircuitState.openedUntil = Date.now() + ALADIN_BREAKER_COOLDOWN_MS;
    }
    console.error('[aladinFallback]', err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSupabaseFallbackRows(): Promise<FallbackBookRow[]> {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('isbn, slug, title, author, cover_image, list_price, sale_price, category, status, rating, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(MAX_FETCH);

  if (error || !data) return [];

  return data.map((row) => ({
    isbn: row.isbn,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    coverImage: String(row.cover_image ?? ''),
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    category: String(row.category ?? ''),
    status: String(row.status ?? ''),
    rating: Number(row.rating ?? 0),
  }));
}

export async function searchBooksData(filters: BookFilters): Promise<SearchResponse> {
  const cacheKey = JSON.stringify(filters);
  const cached = serverCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SERVER_CACHE_TTL) return cached.data;

  const result = await searchBooksDataInternal(filters);
  serverCache.set(cacheKey, { data: result, ts: Date.now() });
  if (serverCache.size > 100) {
    const oldest = serverCache.keys().next().value;
    if (oldest) serverCache.delete(oldest);
  }
  return result;
}

async function searchBooksDataInternal(filters: BookFilters): Promise<SearchResponse> {
  if (isUiDesignMode()) return searchDesignModeBooks(filters);

  const client = getMeilisearchClient() ?? getMeilisearchServer();
  if (client) {
    try {
      const index = client.index('books');
      const filterParts = ['isActive = true'];
      if (filters.category) {
        const values = CATEGORY_ALIASES[filters.category] ?? [filters.category];
        const orClauses = values.map((v) => `category = "${v.replace(/"/g, '\\"')}"`).join(' OR ');
        filterParts.push(`(${orClauses})`);
      }
      if (filters.status) filterParts.push(`status = "${filters.status}"`);

      const sortMap: Record<string, string[]> = {
        latest: ['createdAt:desc'],
        price_asc: ['salePrice:asc'],
        price_desc: ['salePrice:desc'],
        rating: ['rating:desc'],
      };

      const rawKeyword = filters.keyword?.trim() ?? '';
      const normalizedKeyword = normalizeForSearch(rawKeyword);
      const searchQuery = rawKeyword ? normalizedKeyword : '';
      const pageSize = filters.pageSize ?? 12;
      const offset = ((filters.page ?? 1) - 1) * pageSize;

      let res = await Promise.race([
        index.search(searchQuery, {
          filter: filterParts.join(' AND '),
          sort: filters.sort ? sortMap[filters.sort] : ['createdAt:desc'],
          limit: pageSize,
          offset,
          matchingStrategy: 'last' as const,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('MEILISEARCH_TIMEOUT')), 3000)),
      ]);

      if ((res.estimatedTotalHits ?? 0) === 0 && rawKeyword && normalizedKeyword !== rawKeyword) {
        try {
          res = await Promise.race([
            index.search(rawKeyword, {
              filter: filterParts.join(' AND '),
              sort: filters.sort ? sortMap[filters.sort] : ['createdAt:desc'],
              limit: pageSize,
              offset,
              matchingStrategy: 'last' as const,
            }),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('MEILISEARCH_TIMEOUT')), 2000)),
          ]);
        } catch {
          /* noop */
        }
      }

      const hits = (res.hits as Record<string, unknown>[]).map((hit) => ({
        isbn: String(hit.isbn ?? ''),
        slug: String(hit.slug ?? ''),
        title: String(hit.title ?? ''),
        author: String(hit.author ?? ''),
        coverImage: String(hit.coverImage ?? ''),
        listPrice: Number(hit.listPrice ?? 0),
        salePrice: Number(hit.salePrice ?? 0),
      }));

      let prioritizedHits = hits;
      if (rawKeyword) {
        const hasTitleMatch = hits.some((hit) => titleMatchesKeyword(hit.title, normalizedKeyword));
        if (hasTitleMatch) prioritizedHits = hits.filter((hit) => titleMatchesKeyword(hit.title, normalizedKeyword));
      }

      const totalHits = prioritizedHits.length;
      const estimatedTotal =
        typeof res.estimatedTotalHits === 'number' ? res.estimatedTotalHits : undefined;
      const titleFiltered = Boolean(rawKeyword && prioritizedHits.length !== hits.length);

      if (rawKeyword && totalHits < ALADIN_SUPPLEMENT_THRESHOLD) {
        const aladinResults = await aladinFallback(rawKeyword, filters.category);
        if (aladinResults.length > 0) {
          const existingIsbns = new Set(prioritizedHits.map((hit) => hit.isbn));
          const merged = deduplicateByIsbn([
            ...prioritizedHits,
            ...aladinResults.filter((item) => !existingIsbns.has(item.isbn)),
          ]);
          return { books: merged, totalCount: merged.length, fromAladin: merged.length > prioritizedHits.length };
        }
      }

      if (totalHits > 0) {
        const totalCount = titleFiltered ? prioritizedHits.length : estimatedTotal ?? totalHits;
        return { books: prioritizedHits, totalCount };
      }
    } catch (e) {
      console.error('[searchBooksData] Meilisearch error:', e instanceof Error ? e.message : String(e));
    }
  }

  if (!isSearchFirestoreFallbackAllowed()) {
    if (filters.keyword?.trim()) {
      const fallback = await aladinFallback(filters.keyword.trim(), filters.category);
      if (fallback.length > 0) return { books: fallback, totalCount: fallback.length, fromAladin: true };
    }
    return { books: [], totalCount: 0 };
  }

  let list: FallbackBookRow[];
  const fromRedis = await getFallbackBooksFromRedis();
  if (fromRedis && fromRedis.length > 0) {
    list = fromRedis;
  } else {
    if (shouldSkipSnapshot()) return { books: [], totalCount: 0 };
    list = await loadSupabaseFallbackRows();
    void setFallbackBooksToRedis(list);
  }

  if (filters.category) list = list.filter((book) => bookMatchesCategoryTab(book.category, filters.category!));
  if (filters.status) list = list.filter((book) => book.status === filters.status);

  if (filters.keyword?.trim()) {
    const normalizedKeyword = normalizeForSearch(filters.keyword);
    const titleMatched = list.filter((book) => titleMatchesKeyword(book.title, normalizedKeyword));
    list = titleMatched.length > 0
      ? titleMatched
      : list.filter(
          (book) =>
            normalizeForSearch(book.author).includes(normalizedKeyword) ||
            normalizeForSearch(book.category).includes(normalizedKeyword) ||
            book.isbn.includes(normalizedKeyword),
        );
  }

  const sortMap: Record<string, (a: FallbackBookRow, b: FallbackBookRow) => number> = {
    price_asc: (a, b) => a.salePrice - b.salePrice,
    price_desc: (a, b) => b.salePrice - a.salePrice,
    rating: (a, b) => b.rating - a.rating,
  };
  if (filters.sort && sortMap[filters.sort]) list = [...list].sort(sortMap[filters.sort]);

  const totalCount = list.length;
  const start = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 12);
  const books = list
    .slice(start, start + (filters.pageSize ?? 12))
    .map(({ category: _c, status: _s, rating: _r, ...book }) => book);

  if (totalCount === 0 && filters.keyword?.trim()) {
    const fallback = await aladinFallback(filters.keyword.trim(), filters.category);
    if (fallback.length > 0) return { books: fallback, totalCount: fallback.length, fromAladin: true };
  }

  return { books, totalCount };
}
