import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { isUiDesignMode } from '@/lib/design-mode';
import type { BookCardBook } from '@/components/books/BookCard';
import type { FeaturedCurationBook } from '@/components/home/FeaturedCuration';
import type { ThemeCurationItem } from '@/components/home/ThemeCuration';
import type { EventCardEvent } from '@/components/events/EventCard';
import type { ConcertVerticalCardItem } from '@/components/concerts/ConcertVerticalCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import { getPublishedYoutubeContentsForHome } from '@/lib/youtube-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBestsellersForHome } from '@/lib/store/book-list-pages';
import { extractCmsValue } from '@/lib/supabase/mappers';
import { GRADE_KEYS, GRADE_TABS, HOME_LANDING_SELECTED_BOOK_COUNT, type GradeKey } from '@/lib/constants/grades';

export interface StoreHeroImage {
  imageUrl: string;
  linkUrl: string;
}

interface CmsHomeDoc {
  storeHeroImage?: { imageUrl?: string; linkUrl?: string } | null;
  mainBottomLeft?: { imageUrl?: string; linkUrl?: string } | null;
  mainBottomRight?: { imageUrl?: string; linkUrl?: string } | null;
  aboutBookstoreImage?: { imageUrl?: string; linkUrl?: string } | null;
  meetingAtBookstoreImage?: { imageUrl?: string } | null;
  heroBanners?: Array<{
    id: string;
    imageUrl: string;
    linkUrl: string;
    position?: string;
    isActive?: boolean;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    order?: number;
  }>;
  featuredBooks?: Array<{
    isbn: string;
    title: string;
    coverImage: string;
    priority: number;
    recommendationText?: string;
  }>;
  themeCurations?: Array<{
    id: string;
    title: string;
    description?: string;
    isbns?: string[];
    books?: { isbn: string }[];
    order?: number;
  }>;
  selectedBooks?: Record<string, { isbn: string; title: string; coverImage: string }[]>;
  selectedBooksBanner?: { imageUrl?: string; linkUrl?: string } | null;
}

export interface ParsedBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
}

export interface MainBottomBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export interface HomeTopData {
  storeHero: StoreHeroImage | null;
  heroBanners: ParsedBanner[];
  demoConcert: ConcertVerticalCardItem | null;
  meetingAtBookstoreImage: { imageUrl: string } | null;
}

export interface HomeBelowData {
  mainBottomLeft: MainBottomBanner | null;
  mainBottomRight: MainBottomBanner | null;
  aboutBookstoreImage: { imageUrl: string; linkUrl: string } | null;
  allBanners: ParsedBanner[];
  featured: { books: FeaturedCurationBook[]; recommendationText?: string };
  themeCurations: ThemeCurationItem[];
  newBooks: BookCardBook[];
  bestsellers: BookCardBook[];
  articles: ArticleCardArticle[];
  youtubeHomeItems: YoutubeContentListItem[];
}

export interface HomePageData {
  storeHero: StoreHeroImage | null;
  mainBottomLeft: MainBottomBanner | null;
  mainBottomRight: MainBottomBanner | null;
  aboutBookstoreImage: { imageUrl: string; linkUrl: string } | null;
  meetingAtBookstoreImage: { imageUrl: string } | null;
  allBanners: ParsedBanner[];
  featured: { books: FeaturedCurationBook[]; recommendationText?: string };
  themeCurations: ThemeCurationItem[];
  newBooks: BookCardBook[];
  bestsellers: BookCardBook[];
  topConcert: ConcertVerticalCardItem | null;
  events: EventCardEvent[];
  articles: ArticleCardArticle[];
  youtubeHomeItems: YoutubeContentListItem[];
}

interface HomeBookRecord {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
  description: string;
  isActive: boolean;
}

function now(): number {
  return Date.now();
}

const MEM_TTL_MS = 10 * 60_000;

let _memHomeDoc: { data: Record<string, unknown> | null; ts: number } | null = null;
let _memHomeFull: { data: HomePageData; ts: number } | null = null;
let _memHomeTop: { data: HomeTopData; ts: number } | null = null;
let _memHomeBelow: { data: HomeBelowData; ts: number } | null = null;

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed | 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    const j = (s >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function threeDaySeed(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3));
}

function dailySeedAfter8amKst(nowMs = Date.now()): number {
  const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  const date = kstNow.getUTCDate();
  const hour = kstNow.getUTCHours();

  const effective = hour >= 8
    ? Date.UTC(year, month, date)
    : Date.UTC(year, month, date - 1);

  return Math.floor(effective / (1000 * 60 * 60 * 24));
}

/** CMS 선정도서: 학년 키 순(e1→m3)으로 합치고 ISBN 중복 제거 — 랜딩은 이 순서의 앞쪽부터 노출 */
function orderedUniqueSelectedIsbns(
  raw: CmsHomeDoc['selectedBooks'],
): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { key } of GRADE_KEYS) {
    const arr = raw[key as GradeKey];
    if (!Array.isArray(arr)) continue;
    for (const book of arr) {
      const isbn = typeof book?.isbn === 'string' ? book.isbn.trim() : '';
      if (!isbn || seen.has(isbn)) continue;
      seen.add(isbn);
      out.push(isbn);
    }
  }
  return out;
}

function normalizeCmsImageUrl(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return `/${s}`;
}

function cmsBannerStartMs(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00+09:00`);
    const t = Date.parse(raw);
    return Number.isNaN(t) ? 0 : t;
  }
  if (raw instanceof Date) return raw.getTime();
  return 0;
}

function cmsBannerEndMs(raw: unknown): number {
  if (raw == null || raw === '') return Infinity;
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T23:59:59.999+09:00`);
    const t = Date.parse(raw);
    return Number.isNaN(t) ? Infinity : t;
  }
  if (raw instanceof Date) return raw.getTime();
  return Infinity;
}

async function readCmsHomeFromSupabase(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cms')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();

    if (error) return null;
    return extractCmsValue(data?.value);
  } catch {
    return null;
  }
}

async function readCmsHomeCachedInMemory(): Promise<Record<string, unknown> | null> {
  if (_memHomeDoc && Date.now() - _memHomeDoc.ts < MEM_TTL_MS) {
    return _memHomeDoc.data;
  }
  const data = await readCmsHomeFromSupabase();
  _memHomeDoc = { data, ts: Date.now() };
  return data;
}

export function invalidateCmsHomeMemCache() {
  _memHomeDoc = null;
  _memHomeFull = null;
  _memHomeTop = null;
  _memHomeBelow = null;
}

const getCmsHomeDocCached = unstable_cache(
  readCmsHomeFromSupabase,
  ['cms-home-doc'],
  { tags: [CMS_HOME_CACHE_TAG], revalidate: 300 },
);

export async function getCmsHomeDocRaw(): Promise<Record<string, unknown> | null> {
  if (process.env.NODE_ENV === 'development') {
    return readCmsHomeCachedInMemory();
  }
  return getCmsHomeDocCached();
}

const getCmsHomeDoc = cache(async (): Promise<CmsHomeDoc | null> => {
  const raw = await getCmsHomeDocRaw();
  return raw as CmsHomeDoc | null;
});

const getBooksMap = cache(async (isbns: string[]) => {
  const uniqueIsbns = Array.from(new Set(isbns.filter(Boolean)));
  if (uniqueIsbns.length === 0) return new Map<string, HomeBookRecord>();

  const { data, error } = await supabaseAdmin
    .from('books')
    .select('isbn, slug, title, author, cover_image, list_price, sale_price, description, is_active')
    .in('isbn', uniqueIsbns);

  if (error || !data) return new Map<string, HomeBookRecord>();

  return new Map(
    data.map((row) => [
      row.isbn,
      {
        isbn: row.isbn,
        slug: row.slug ?? '',
        title: row.title ?? '',
        author: row.author ?? '',
        coverImage: row.cover_image ?? '',
        listPrice: row.list_price ?? 0,
        salePrice: row.sale_price ?? 0,
        description: row.description ?? '',
        isActive: row.is_active ?? true,
      },
    ]),
  );
});

function toBookCardBook(isbn: string, book: HomeBookRecord, fallback?: Partial<BookCardBook>): BookCardBook {
  return {
    isbn,
    slug: book.slug || fallback?.slug || '',
    title: book.title || fallback?.title || '',
    author: book.author || fallback?.author || '',
    coverImage: book.coverImage || fallback?.coverImage || '',
    listPrice: book.listPrice ?? fallback?.listPrice ?? 0,
    salePrice: book.salePrice ?? fallback?.salePrice ?? 0,
  };
}

const emptyHomeData = (): HomePageData => ({
  storeHero: null,
  mainBottomLeft: null,
  mainBottomRight: null,
  aboutBookstoreImage: null,
  meetingAtBookstoreImage: null,
  allBanners: [],
  featured: { books: [], recommendationText: undefined },
  themeCurations: [],
  newBooks: [],
  bestsellers: [],
  topConcert: null,
  events: [],
  articles: [],
  youtubeHomeItems: [],
});

const designModeHomeData = (): HomePageData => ({
  storeHero: {
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=2000',
    linkUrl: '/',
  },
  mainBottomLeft: null,
  mainBottomRight: null,
  aboutBookstoreImage: null,
  meetingAtBookstoreImage: null,
  allBanners: [
    {
      id: 'design-main-hero-1',
      imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000',
      linkUrl: '/books',
      position: 'main_hero',
    },
    {
      id: 'design-main-hero-2',
      imageUrl: 'https://images.unsplash.com/photo-1455885666463-9b3f11d03c80?auto=format&fit=crop&q=80&w=2000',
      linkUrl: '/books?sort=latest',
      position: 'main_hero',
    },
  ],
  featured: {
    books: [
      {
        isbn: 'design-1',
        slug: 'design-book-1',
        title: '프로젝트 디자이너의 책상',
        author: '미옥 에디터',
        coverImage: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=400',
        listPrice: 18000,
        salePrice: 16200,
        description: '디자이너의 탐구를 실무에 적용하는 방법을 다룹니다.',
        recommendationText: 'UI 작업 모드 샘플 도서',
      },
    ],
    recommendationText: 'UI 작업 모드 샘플 도서',
  },
  themeCurations: [],
  newBooks: [],
  bestsellers: [],
  topConcert: {
    id: 'design-concert-1',
    title: '미옥서원 릴레이 북콘서트: 작가와의 만남',
    slug: 'design-concert-1',
    imageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=1600',
    date: new Date(Date.now() + 5 * 86400000).toISOString(),
    statusBadge: '예약중',
    feeLabel: '참가비 20,000원',
    description: '서점 안에서 작가와 독자가 가까이 만나는 저녁 북콘서트입니다.',
  },
  events: [
    {
      eventId: 'design-event-1',
      title: '디자인 모드 샘플 이벤트',
      type: 'book_concert',
      description: 'Firestore reads 없이 화면 검수용 샘플 데이터입니다.',
      imageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=1600',
      date: new Date(Date.now() + 5 * 86400000).toISOString(),
      capacity: 30,
      registeredCount: 7,
    },
  ],
  articles: [],
  youtubeHomeItems: [],
});

function parseBannerList(cmsHome: CmsHomeDoc | null): ParsedBanner[] {
  return (cmsHome?.heroBanners ?? [])
    .filter((banner) => banner.isActive !== false)
    .map((banner) => ({
      id: banner.id,
      imageUrl: normalizeCmsImageUrl(banner.imageUrl),
      linkUrl: banner.linkUrl,
      position: banner.position ?? 'main_hero',
      startDate: cmsBannerStartMs(banner.startDate),
      endDate: cmsBannerEndMs(banner.endDate),
      order: banner.order ?? 0,
    }))
    .filter((banner) => now() >= banner.startDate && now() <= banner.endDate)
    .sort((a, b) => a.order - b.order)
    .map(({ id, imageUrl, linkUrl, position }) => ({ id, imageUrl, linkUrl, position }));
}

async function buildHomeData(): Promise<HomePageData> {
  const cmsHome = await getCmsHomeDoc().catch(() => null);
  if (!cmsHome) return emptyHomeData();

  const storeHero = cmsHome.storeHeroImage?.imageUrl?.trim()
    ? {
        imageUrl: normalizeCmsImageUrl(cmsHome.storeHeroImage.imageUrl),
        linkUrl: cmsHome.storeHeroImage.linkUrl?.trim() || '/',
      }
    : null;

  const mainBottomLeft = cmsHome.mainBottomLeft?.imageUrl?.trim()
    ? {
        id: 'main_bottom_left',
        imageUrl: normalizeCmsImageUrl(cmsHome.mainBottomLeft.imageUrl),
        linkUrl: cmsHome.mainBottomLeft.linkUrl?.trim() || '/',
      }
    : null;

  const mainBottomRight = cmsHome.mainBottomRight?.imageUrl?.trim()
    ? {
        id: 'main_bottom_right',
        imageUrl: normalizeCmsImageUrl(cmsHome.mainBottomRight.imageUrl),
        linkUrl: cmsHome.mainBottomRight.linkUrl?.trim() || '/',
      }
    : null;

  const aboutBookstoreImage = cmsHome.aboutBookstoreImage?.imageUrl?.trim()
    ? {
        imageUrl: normalizeCmsImageUrl(cmsHome.aboutBookstoreImage.imageUrl),
        linkUrl: cmsHome.aboutBookstoreImage.linkUrl?.trim() || '/',
      }
    : null;

  const meetingAtBookstoreImage = cmsHome.meetingAtBookstoreImage?.imageUrl?.trim()
    ? { imageUrl: normalizeCmsImageUrl(cmsHome.meetingAtBookstoreImage.imageUrl) }
    : null;

  const allBanners = parseBannerList(cmsHome);

  const featuredBooks = seededShuffle(
    (cmsHome.featuredBooks ?? []).slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    threeDaySeed(),
  );
  const themeCurations = (cmsHome.themeCurations ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const rawSelectedBooks = cmsHome.selectedBooks ?? {};
  const selectedBooksIsbns = orderedUniqueSelectedIsbns(rawSelectedBooks);

  const cmsReferencedIsbns = [
    ...featuredBooks.map((item) => item.isbn),
    ...themeCurations.flatMap((theme) => theme.isbns?.length ? theme.isbns : (theme.books?.map((book) => book.isbn) ?? [])),
    ...selectedBooksIsbns,
  ];

  const cmsBooksMap = await getBooksMap(cmsReferencedIsbns);

  const featured = {
    books: featuredBooks
      .map((item) => {
        const book = cmsBooksMap.get(item.isbn);
        if (!book || book.isActive === false) return null;
        const card = toBookCardBook(item.isbn, book, item);
        return {
          ...card,
          description: book.description?.trim() || undefined,
          recommendationText: item.recommendationText,
        };
      })
      .filter(Boolean) as FeaturedCurationBook[],
    recommendationText: featuredBooks[0]?.recommendationText,
  };

  let normalizedThemeCurations: ThemeCurationItem[];
  if (selectedBooksIsbns.length > 0) {
    const landingIsbns = selectedBooksIsbns.slice(0, HOME_LANDING_SELECTED_BOOK_COUNT);
    const landingBookCards = landingIsbns
      .map((isbn) => {
        const book = cmsBooksMap.get(isbn);
        if (!book || book.isActive === false) return null;
        return toBookCardBook(isbn, book);
      })
      .filter((book): book is BookCardBook => book !== null);
    normalizedThemeCurations = landingBookCards.length > 0
      ? [{ id: 'selected_books', title: '이달의 미옥 추천도서', books: landingBookCards }]
      : [];
  } else {
    normalizedThemeCurations = themeCurations
      .map((theme) => {
        const isbns = theme.isbns?.length ? theme.isbns : (theme.books?.map((book) => book.isbn) ?? []);
        const books = isbns
          .map((isbn) => {
            const book = cmsBooksMap.get(isbn);
            if (!book || book.isActive === false) return null;
            return toBookCardBook(isbn, book);
          })
          .filter((book): book is BookCardBook => book !== null);
        if (books.length === 0) return null;
        return { id: theme.id, title: theme.title, description: theme.description, books };
      })
      .filter(Boolean) as ThemeCurationItem[];
  }

  const [newBooksRes, concertsRes, eventsRes, articlesRes] = await Promise.all([
    supabaseAdmin
      .from('books')
      .select('isbn, slug, title, author, cover_image, list_price, sale_price, description, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabaseAdmin
      .from('concerts')
      .select('id, title, slug, image_url, date, status_badge, fee_label, description, is_active')
      .eq('is_active', true)
      .order('date', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('events')
      .select('event_id, title, type, description, image_url, date, location, capacity, registered_count, is_active')
      .eq('is_active', true)
      .limit(3),
    supabaseAdmin
      .from('articles')
      .select('article_id, slug, type, title, thumbnail_url, is_published')
      .eq('is_published', true)
      .limit(3),
  ]);

  const newBooks = (newBooksRes.data ?? []).map((row) =>
    toBookCardBook(row.isbn, {
      isbn: row.isbn,
      slug: row.slug ?? '',
      title: row.title ?? '',
      author: row.author ?? '',
      coverImage: row.cover_image ?? '',
      listPrice: row.list_price ?? 0,
      salePrice: row.sale_price ?? 0,
      description: row.description ?? '',
      isActive: row.is_active ?? true,
    }),
  );

  const events = (eventsRes.data ?? []).map((row) => ({
    eventId: row.event_id,
    title: row.title ?? '',
    type: row.type ?? '',
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    date: row.date ?? '',
    location: row.location ?? '',
    capacity: Number(row.capacity ?? 0),
    registeredCount: Number(row.registered_count ?? 0),
  }));

  const topConcertRow = (concertsRes.data ?? [])[0];
  const topConcert = topConcertRow
    ? {
        id: String(topConcertRow.id ?? ''),
        title: String(topConcertRow.title ?? ''),
        slug: String(topConcertRow.slug ?? topConcertRow.id ?? ''),
        imageUrl: String(topConcertRow.image_url ?? ''),
        date: topConcertRow.date ?? null,
        statusBadge: String(topConcertRow.status_badge ?? ''),
        feeLabel: String(topConcertRow.fee_label ?? ''),
        description: String(topConcertRow.description ?? ''),
      }
    : null;

  const articles = (articlesRes.data ?? []).map((row) => ({
    articleId: row.article_id,
    slug: row.slug ?? '',
    type: row.type ?? '',
    title: row.title ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
  }));

  return {
    storeHero,
    mainBottomLeft,
    mainBottomRight,
    aboutBookstoreImage,
    meetingAtBookstoreImage,
    allBanners,
    featured,
    themeCurations: normalizedThemeCurations,
    newBooks,
    bestsellers: [],
    topConcert,
    events,
    articles,
    youtubeHomeItems: [],
  };
}

const getHomePageDataInternal = cache(async (): Promise<HomePageData> => buildHomeData());

const getHomePageDataCached = unstable_cache(
  async () => getHomePageDataInternal(),
  ['home-page-full'],
  { tags: [CMS_HOME_CACHE_TAG], revalidate: 300 },
);

export async function getHomePageData(): Promise<HomePageData> {
  if (isUiDesignMode()) return designModeHomeData();

  if (process.env.NODE_ENV === 'development') {
    if (_memHomeFull && Date.now() - _memHomeFull.ts < MEM_TTL_MS) {
      return _memHomeFull.data;
    }
    const data = await getHomePageDataInternal();
    const ts = Date.now();
    _memHomeFull = { data, ts };
    _memHomeTop = {
      data: {
        storeHero: data.storeHero,
        heroBanners: data.allBanners.filter((banner) => banner.position === 'main_hero'),
        demoConcert: data.topConcert,
        meetingAtBookstoreImage: data.meetingAtBookstoreImage,
      },
      ts,
    };
    const { storeHero: _storeHero, events: _events, topConcert: _topConcert, meetingAtBookstoreImage: _meeting, ...below } = data;
    _memHomeBelow = { data: below, ts };
    return data;
  }

  return getHomePageDataCached();
}

const getHomeTopDataInternal = cache(async (): Promise<HomeTopData> => {
  const data = await getHomePageDataInternal();
  return {
    storeHero: data.storeHero,
    heroBanners: data.allBanners.filter((banner) => banner.position === 'main_hero'),
    demoConcert: data.topConcert,
    meetingAtBookstoreImage: data.meetingAtBookstoreImage,
  };
});

const getHomeTopDataCached = unstable_cache(
  async () => getHomeTopDataInternal(),
  ['home-top'],
  { tags: [CMS_HOME_CACHE_TAG], revalidate: 300 },
);

export async function getHomeTopData(): Promise<HomeTopData> {
  if (isUiDesignMode()) {
    const data = designModeHomeData();
    return {
      storeHero: data.storeHero,
      heroBanners: data.allBanners.filter((banner) => banner.position === 'main_hero'),
      demoConcert: data.topConcert,
      meetingAtBookstoreImage: data.meetingAtBookstoreImage,
    };
  }

  if (process.env.NODE_ENV === 'development') {
    if (_memHomeTop && Date.now() - _memHomeTop.ts < MEM_TTL_MS) {
      return _memHomeTop.data;
    }
    if (_memHomeFull && Date.now() - _memHomeFull.ts < MEM_TTL_MS) {
      return {
        storeHero: _memHomeFull.data.storeHero,
        heroBanners: _memHomeFull.data.allBanners.filter((banner) => banner.position === 'main_hero'),
        demoConcert: _memHomeFull.data.topConcert,
        meetingAtBookstoreImage: _memHomeFull.data.meetingAtBookstoreImage,
      };
    }
    const data = await getHomeTopDataInternal();
    _memHomeTop = { data, ts: Date.now() };
    return data;
  }

  return getHomeTopDataCached();
}

const getHomeBelowDataInternal = cache(async (): Promise<HomeBelowData> => {
  const data = await getHomePageDataInternal();
  const { storeHero: _storeHero, events: _events, topConcert: _topConcert, meetingAtBookstoreImage: _meetingAtBookstoreImage, ...below } = data;
  return below;
});

const getHomeBelowDataCached = unstable_cache(
  async () => getHomeBelowDataInternal(),
  ['home-below'],
  { tags: [CMS_HOME_CACHE_TAG], revalidate: 300 },
);

export async function getHomeBelowData(): Promise<HomeBelowData> {
  if (isUiDesignMode()) {
    const { storeHero: _storeHero, events: _events, topConcert: _topConcert, meetingAtBookstoreImage: _meetingAtBookstoreImage, ...below } = designModeHomeData();
    return below;
  }

  /** 홈 ISR 캐시에 묶인 유튜브·베스트만 매 요청 갱신 — 메인+추천 3개이면 DB에 공개 영상 4건 이상 권장 */
  async function withFreshBestsellersAndYoutube(base: HomeBelowData): Promise<HomeBelowData> {
    const [bestsellers, youtubeHomeItems] = await Promise.all([
      getBestsellersForHome(12),
      getPublishedYoutubeContentsForHome(8),
    ]);
    return {
      ...base,
      bestsellers,
      youtubeHomeItems: seededShuffle(youtubeHomeItems, dailySeedAfter8amKst()),
    };
  }

  if (process.env.NODE_ENV === 'development') {
    if (_memHomeBelow && Date.now() - _memHomeBelow.ts < MEM_TTL_MS) {
      return withFreshBestsellersAndYoutube(_memHomeBelow.data);
    }
    if (_memHomeFull && Date.now() - _memHomeFull.ts < MEM_TTL_MS) {
      const { storeHero: _storeHero, events: _events, topConcert: _topConcert, meetingAtBookstoreImage: _meetingAtBookstoreImage, ...below } = _memHomeFull.data;
      return withFreshBestsellersAndYoutube(below);
    }
    const data = await getHomeBelowDataInternal();
    _memHomeBelow = { data, ts: Date.now() };
    return withFreshBestsellersAndYoutube(data);
  }

  const cached = await getHomeBelowDataCached();
  return withFreshBestsellersAndYoutube(cached);
}
